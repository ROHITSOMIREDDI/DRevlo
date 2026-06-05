import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getInstallationClient, syncCommits, syncPullRequests } from '@/lib/github';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login?error=unauthorized`);
  }

  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get('installation_id');
  const teamId = searchParams.get('state'); // State stores the teamId passed during redirect initiation

  if (!installationId || !teamId) {
    return NextResponse.redirect(`${appUrl}/settings?error=missing_installation_params`);
  }

  try {
    // 1. Verify user is ADMIN of the target team
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.userId,
        },
      },
    });

    if (!membership || membership.role !== 'ADMIN') {
      return NextResponse.redirect(`${appUrl}/settings?error=forbidden_connection`);
    }

    // 2. Fetch team and owner plan to check limits
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { owner: true },
    });

    if (!team) {
      return NextResponse.redirect(`${appUrl}/settings?error=team_not_found`);
    }

    // 3. Fetch accessible repositories for this installation and sync them to the database
    const octokit = await getInstallationClient(installationId);
    const reposResponse = await octokit.rest.apps.listReposAccessibleToInstallation({
      per_page: 100,
    });

    const repositories = reposResponse.data.repositories;

    console.log(`[GitHub Connect] Successfully authenticated and fetched ${repositories.length} repositories for installation ${installationId}`);
    repositories.forEach(repo => {
      console.log(`  - Repo found: ${repo.full_name} (ID: ${repo.id})`);
    });

    // Enforce limits: Free tier can connect a maximum of 3 repositories
    const isFree = team.owner.plan === 'FREE';
    const reposToSync = isFree ? repositories.slice(0, 3) : repositories;
    const limitReached = isFree && repositories.length > 3;

    const repositoryUpserts = reposToSync.map((repo) => {
      return prisma.repository.upsert({
        where: {
          teamId_githubRepoId: {
            teamId,
            githubRepoId: String(repo.id),
          },
        },
        update: {
          name: repo.name,
          fullName: repo.full_name,
        },
        create: {
          teamId,
          githubRepoId: String(repo.id),
          name: repo.name,
          fullName: repo.full_name,
        },
      });
    });

    await Promise.all(repositoryUpserts);

    // Associate the installationId with the team in the database after success
    await prisma.team.update({
      where: { id: teamId },
      data: {
        githubOrg: installationId,
      },
    });

    // Trigger initial background sync so data is populated immediately
    try {
      const dbRepos = await prisma.repository.findMany({
        where: { teamId },
      });
      dbRepos.forEach((repo) => {
        syncCommits(repo.id).catch((err) =>
          console.error(`Background commit sync failed for repository ${repo.fullName}:`, err)
        );
        syncPullRequests(repo.id).catch((err) =>
          console.error(`Background PR sync failed for repository ${repo.fullName}:`, err)
        );
      });
    } catch (syncErr) {
      console.error('Failed to trigger background synchronization:', syncErr);
    }

    // Redirect user back to workspace settings indicating success
    const redirectUrl = `${appUrl}/settings?github_connected=success${limitReached ? '&warning=repo_limit_reached' : ''}`;
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Failed to handle GitHub App installation callback:', error);
    return NextResponse.redirect(`${appUrl}/settings?error=connection_callback_failed`);
  }
}
