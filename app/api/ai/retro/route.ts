import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { generateText } from '@/lib/ai';
import { getRetroPrompt, getRetroSystemInstruction } from '@/prompts/retro';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');
  const sprintId = searchParams.get('sprintId');
  const force = searchParams.get('force') === 'true';

  if (!teamId) {
    return NextResponse.json({ error: 'Missing teamId parameter' }, { status: 400 });
  }

  try {
    // 1. Verify user belongs to the team
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.userId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden: You do not belong to this team' }, { status: 403 });
    }

    // 1.5 Enforce Pro-tier gating for manual retrospective generation
    if (force) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { plan: true },
      });
      if (!dbUser || dbUser.plan !== 'PRO') {
        return NextResponse.json(
          { error: 'Upgrade Required: On-demand AI retrospective generation is a Pro tier feature.' },
          { status: 403 }
        );
      }
    }

    // 2. Fetch Sprint details
    let sprint = null;
    let startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // Default to last 14 days
    let endDate = new Date();
    let sprintName = 'Last 14 Days';
    let sprintIdKey = 'last_14_days';

    if (sprintId) {
      sprint = await prisma.sprint.findUnique({
        where: { id: sprintId },
      });
      if (!sprint || sprint.teamId !== teamId) {
        return NextResponse.json({ error: 'Sprint not found or does not belong to this team' }, { status: 400 });
      }
      startDate = sprint.startDate;
      endDate = sprint.endDate;
      sprintName = sprint.name;
      sprintIdKey = sprint.id;
    } else {
      // Find the latest sprint for the team
      const latestSprint = await prisma.sprint.findFirst({
        where: { teamId },
        orderBy: { endDate: 'desc' },
      });
      if (latestSprint) {
        sprint = latestSprint;
        startDate = latestSprint.startDate;
        endDate = latestSprint.endDate;
        sprintName = latestSprint.name;
        sprintIdKey = latestSprint.id;
      }
    }

    // 3. Check cache
    const cachedType = `retro_${sprintIdKey}`;
    const cachedReport = await prisma.aiReport.findFirst({
      where: {
        teamId,
        type: cachedType,
      },
      orderBy: {
        generatedAt: 'desc',
      },
    });

    if (cachedReport && !force) {
      return NextResponse.json({
        sprintName,
        startDate,
        endDate,
        retro: cachedReport.content,
        cached: true,
        generatedAt: cachedReport.generatedAt,
      });
    }

    // 4. Gather metrics for the sprint window
    // A. Shipped PRs (merged during sprint)
    const mergedPrs = await prisma.pullRequest.findMany({
      where: {
        repository: { teamId },
        state: 'merged',
        mergedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { title: true },
    });
    const shippedPrTitles = mergedPrs.map((pr) => pr.title);
    const sprintVelocity = mergedPrs.length;

    // B. PRs closed without merge during sprint
    const prsClosedNoMerge = await prisma.pullRequest.count({
      where: {
        repository: { teamId },
        state: 'closed',
        createdAt: { gte: startDate },
        mergedAt: null,
      },
    });

    // C. Blocker notes from standups during sprint
    const standups = await prisma.standup.findMany({
      where: {
        teamId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { content: true },
    });

    const blockerNotes: string[] = [];
    standups.forEach((s) => {
      try {
        const parsed = JSON.parse(s.content);
        if (parsed.blockers && parsed.blockers.toLowerCase() !== 'none' && parsed.blockers.trim() !== '') {
          blockerNotes.push(parsed.blockers.trim());
        }
      } catch {
        // Ignored
      }
    });

    // Keep unique blockers, limit to 5 to avoid token bloat
    const uniqueBlockers = Array.from(new Set(blockerNotes)).slice(0, 5);

    // 5. Generate retrospective report via Gemini
    const systemInstruction = getRetroSystemInstruction();
    const prompt = getRetroPrompt(
      sprintName,
      shippedPrTitles,
      uniqueBlockers,
      sprintVelocity,
      prsClosedNoMerge
    );

    const retroText = await generateText(prompt, systemInstruction);

    // 6. Save to cache
    await prisma.aiReport.create({
      data: {
        teamId,
        type: cachedType,
        content: retroText,
      },
    });

    return NextResponse.json({
      sprintName,
      startDate,
      endDate,
      retro: retroText,
      cached: false,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to generate sprint retrospective:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
