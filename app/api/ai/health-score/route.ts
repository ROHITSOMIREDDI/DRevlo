import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { generateText } from '@/lib/ai';
import { getHealthScorePrompt, getHealthScoreSystemInstruction } from '@/prompts/health-score';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate Limiting Check
  const limiter = await rateLimit(request, 'ai-health-score', 5, 60);
  if (!limiter.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limiter.limit),
          'X-RateLimit-Remaining': String(limiter.remaining),
          'X-RateLimit-Reset': String(limiter.reset),
        },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');
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

    // 1.5 Enforce Pro-tier gating for manual regeneration
    if (force) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { plan: true },
      });
      if (!dbUser || dbUser.plan !== 'PRO') {
        return NextResponse.json(
          { error: 'Upgrade Required: On-demand AI insights regeneration is a Pro tier feature.' },
          { status: 403 }
        );
      }
    }

    // 2. Check cache (24 hours cache window)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cachedReport = await prisma.aiReport.findFirst({
      where: {
        teamId,
        type: 'health_score',
        generatedAt: {
          gte: oneDayAgo,
        },
      },
      orderBy: {
        generatedAt: 'desc',
      },
    });

    if (cachedReport && !force) {
      try {
        const parsedContent = JSON.parse(cachedReport.content);
        return NextResponse.json({
          ...parsedContent,
          generatedAt: cachedReport.generatedAt,
          cached: true,
        });
      } catch (err) {
        console.error('Failed to parse cached health score content:', err);
      }
    }

    // 3. Compute repository performance metrics for the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const teamMembersCount = await prisma.teamMember.count({
      where: { teamId },
    });
    const devCount = teamMembersCount || 1;

    // A. PRs merged and Cycle time
    const mergedPrs = await prisma.pullRequest.findMany({
      where: {
        repository: { teamId },
        state: 'merged',
        mergedAt: { gte: sevenDaysAgo },
      },
      select: { cycleTimeHours: true },
    });
    const prsMerged = mergedPrs.length;
    const totalCycleTime = mergedPrs.reduce((acc, pr) => acc + (pr.cycleTimeHours || 0), 0);
    const avgCycleTimeHours = prsMerged > 0 ? totalCycleTime / prsMerged : 24.0;

    // B. Commits per dev per day
    const commitCount = await prisma.commit.count({
      where: {
        repository: { teamId },
        timestamp: { gte: sevenDaysAgo },
      },
    });
    const commitsPerDevPerDay = commitCount / (devCount * 7);

    // C. Review turnaround hours
    const prsWithReviews = await prisma.pullRequest.findMany({
      where: {
        repository: { teamId },
        createdAt: { gte: sevenDaysAgo },
        reviews: { some: {} },
      },
      include: {
        reviews: {
          orderBy: { submittedAt: 'asc' },
          take: 1,
        },
      },
    });
    let totalReviewDiffHours = 0;
    prsWithReviews.forEach((pr) => {
      const firstReview = pr.reviews[0];
      if (firstReview) {
        const diffMs = firstReview.submittedAt.getTime() - pr.createdAt.getTime();
        totalReviewDiffHours += diffMs / (1000 * 60 * 60);
      }
    });
    const avgReviewHours = prsWithReviews.length > 0 ? totalReviewDiffHours / prsWithReviews.length : 12.0;

    // D. Standup completion rate
    const standupCount = await prisma.standup.count({
      where: {
        teamId,
        date: { gte: sevenDaysAgo },
      },
    });
    const totalExpectedStandups = devCount * 7;
    const standupCompletionRate = Math.min(
      Math.round((standupCount / totalExpectedStandups) * 100),
      100
    );

    // 4. Generate health score via Gemini
    const systemInstruction = getHealthScoreSystemInstruction();
    const prompt = getHealthScorePrompt(
      avgCycleTimeHours,
      commitsPerDevPerDay,
      avgReviewHours,
      standupCompletionRate,
      prsMerged
    );

    const aiResponse = await generateText(prompt, systemInstruction, 'application/json');

    // Parse to validate format
    let reportData;
    try {
      reportData = JSON.parse(aiResponse);
    } catch {
      console.warn('Gemini response was not valid JSON, creating fallback structure:', aiResponse);
      // Clean potential JSON markdown blocks if any
      const cleanedText = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      try {
        reportData = JSON.parse(cleanedText);
      } catch {
        // Fallback structure
        reportData = {
          score: 75,
          explanation: 'Calculated default score due to summary processing format validation constraints.',
          risks: ['Could not parse AI response JSON structure.'],
        };
      }
    }

    // Include calculated metrics in response for detailed display
    const finalReport = {
      ...reportData,
      metrics: {
        avgCycleTimeHours,
        commitsPerDevPerDay,
        avgReviewHours,
        standupCompletionRate,
        prsMerged,
      },
    };

    // 5. Store in the AI Reports cache
    await prisma.aiReport.create({
      data: {
        teamId,
        type: 'health_score',
        content: JSON.stringify(finalReport),
      },
    });

    return NextResponse.json({
      ...finalReport,
      generatedAt: new Date(),
      cached: false,
    });
  } catch (error) {
    console.error('Failed to calculate team health score:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
