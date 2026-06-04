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

    // 2. Fetch all PRs for the team repositories
    const prs = await prisma.pullRequest.findMany({
      where: {
        repository: {
          teamId,
        },
      },
    });

    const openPrs = prs.filter((p) => p.state === 'open');
    const mergedPrs = prs.filter((p) => p.state === 'merged' && p.cycleTimeHours !== null);

    // Calculate metrics
    const totalMerged = mergedPrs.length;
    const avgCycleTime =
      totalMerged > 0
        ? mergedPrs.reduce((acc: number, curr) => acc + (curr.cycleTimeHours || 0), 0) / totalMerged
        : 0;

    const closedPrs = prs.filter((p) => p.state === 'closed');
    const mergeRate =
      totalMerged + closedPrs.length > 0
        ? (totalMerged / (totalMerged + closedPrs.length)) * 100
        : 0;

    // 3. Generate daily cycle time data (last 14 days)
    const chartData: Array<{ name: string; avgHours: number; p50Hours: number; p90Hours: number }> = [];
    const today = startOfDay(new Date());

    for (let i = 14; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dateLabel = format(date, 'MMM d');

      const prsOnDate = mergedPrs.filter(
        (p) => p.mergedAt && format(p.mergedAt, 'yyyy-MM-dd') === dateStr
      );

      if (prsOnDate.length > 0) {
        const hours = prsOnDate.map((p) => p.cycleTimeHours || 0).sort((a, b) => a - b);
        const sum = hours.reduce((acc: number, curr) => acc + curr, 0);
        const avg = sum / hours.length;

        // p50 (median)
        const p50 = hours[Math.floor(hours.length * 0.5)];
        // p90
        const p90 = hours[Math.floor(hours.length * 0.9)];

        chartData.push({
          name: dateLabel,
          avgHours: avg,
          p50Hours: p50,
          p90Hours: p90,
        });
      } else {
        chartData.push({
          name: dateLabel,
          avgHours: 0,
          p50Hours: 0,
          p90Hours: 0,
        });
      }
    }

    return NextResponse.json({
      chartData,
      metrics: {
        openPrsCount: openPrs.length,
        avgCycleTimeHours: avgCycleTime,
        mergeRatePercent: mergeRate,
      },
    });
  } catch (error) {
    console.error('Failed to fetch PR analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
