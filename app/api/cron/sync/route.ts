import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { syncCommits, syncPullRequests } from '@/lib/github';

export async function GET(request: NextRequest) {
  // Validate cron token to protect route against unauthorized manual triggers
  const { searchParams } = new URL(request.url);
  const cronToken = searchParams.get('token');
  const configuredToken = process.env.CRON_SECRET;

  if (configuredToken && cronToken !== configuredToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch all teams connected to GitHub
    const teams = await prisma.team.findMany({
      where: {
        githubOrg: { not: null },
      },
      include: {
        repositories: true,
      },
    });

    let syncCount = 0;
    const errors: Array<{ repoId: string; error: string }> = [];

    // 2. Iterate through all repositories and execute sync
    for (const team of teams) {
      for (const repo of team.repositories) {
        try {
          // Fetch commits since last 24 hours to keep safety net fast and token-efficient
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          await syncCommits(repo.id, since);
          await syncPullRequests(repo.id);
          syncCount++;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'unknown error';
          console.error(`Safety-net sync failed for repository ${repo.fullName}:`, err);
          errors.push({ repoId: repo.id, error: errorMessage });
        }
      }
    }

    return NextResponse.json({
      success: true,
      synchronizedRepositories: syncCount,
      errorsCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Safety-net cron sync job failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
