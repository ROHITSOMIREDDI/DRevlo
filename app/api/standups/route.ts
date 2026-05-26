import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getLocalDateInTimezone } from '@/lib/timezone';
import { z } from 'zod';

const standupSubmitSchema = z.object({
  teamId: z.string().uuid(),
  yesterday: z.string().min(5, 'Yesterday notes must be at least 5 characters long').max(1000),
  today: z.string().min(5, 'Today notes must be at least 5 characters long').max(1000),
  blockers: z.string().max(1000).default('None'),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = standupSubmitSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { teamId, yesterday, today, blockers } = result.data;

    // 1. Verify user belongs to the team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { userId: user.userId },
        },
      },
    });

    if (!team || team.members.length === 0) {
      return NextResponse.json(
        { error: 'Forbidden: You are not a member of this team' },
        { status: 403 }
      );
    }

    // 2. Compute the calendar date in the team's timezone
    const localMidnightDate = getLocalDateInTimezone(new Date(), team.timezone);

    // 3. Check for existing submission for today
    const existingStandup = await prisma.standup.findUnique({
      where: {
        teamId_userId_date: {
          teamId,
          userId: user.userId,
          date: localMidnightDate,
        },
      },
    });

    if (existingStandup) {
      return NextResponse.json(
        { error: 'You have already submitted a standup entry for today' },
        { status: 400 }
      );
    }

    // 4. Create new standup record
    const contentJson = JSON.stringify({ yesterday, today, blockers });
    const newStandup = await prisma.standup.create({
      data: {
        teamId,
        userId: user.userId,
        content: contentJson,
        date: localMidnightDate,
      },
    });

    return NextResponse.json(newStandup, { status: 201 });
  } catch (error) {
    console.error('Failed to submit standup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');

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

    // 2. Retrieve standup records for this team
    const standups = await prisma.standup.findMany({
      where: { teamId },
      orderBy: { date: 'desc' },
      take: 50,
    });

    // 3. Fetch user details mapping to resolve author names
    const userIds = Array.from(new Set(standups.map((s) => s.userId)));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const formattedStandups = standups.map((s) => {
      const author = users.find((u) => u.id === s.userId);
      let parsedContent = { yesterday: '', today: '', blockers: '' };
      try {
        parsedContent = JSON.parse(s.content);
      } catch (e) {
        console.error('Failed to parse standup content JSON:', s.content);
      }

      return {
        id: s.id,
        date: s.date,
        aiSummary: s.aiSummary,
        author: {
          id: s.userId,
          name: author?.name || 'Unknown User',
          email: author?.email || '',
        },
        yesterday: parsedContent.yesterday,
        today: parsedContent.today,
        blockers: parsedContent.blockers,
      };
    });

    return NextResponse.json({ standups: formattedStandups });
  } catch (error) {
    console.error('Failed to retrieve standups history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
