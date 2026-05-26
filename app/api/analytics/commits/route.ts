import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { format, subDays, startOfDay } from 'date-fns';

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

    // 2. Fetch commits in the last 90 days
    const ninetyDaysAgo = subDays(startOfDay(new Date()), 90);
    const commits = await prisma.commit.findMany({
      where: {
        repository: {
          teamId,
        },
        timestamp: {
          gte: ninetyDaysAgo,
        },
      },
      select: {
        timestamp: true,
      },
    });

    // 3. Aggregate commits by date
    const countsMap: { [dateStr: string]: number } = {};
    commits.forEach((commit) => {
      const dateStr = format(commit.timestamp, 'yyyy-MM-dd');
      countsMap[dateStr] = (countsMap[dateStr] || 0) + 1;
    });

    // 4. Format into array of { date: string, count: number }
    const commitsData = Object.keys(countsMap).map((date) => ({
      date,
      count: countsMap[date],
    }));

    return NextResponse.json({
      commits: commitsData,
      totalCommits: commits.length,
    });
  } catch (error) {
    console.error('Failed to fetch commit analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
