import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getInstallationClient } from '@/lib/github';

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

    // 2. Associate the installationId with the team in the database
    await prisma.team.update({
      where: { id: teamId },
      data: {
        githubOrg: installationId,
      },
    });

    // 3. Fetch accessible repositories for this installation and sync them to the database
    const octokit = await getInstallationClient(installationId);
    const reposResponse = await octokit.rest.apps.listReposAccessibleToInstallation({
      per_page: 100,
    });

    const repositories = reposResponse.data.repositories;

    const repositoryUpserts = repositories.map((repo) => {
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

    // Redirect user back to workspace settings indicating success
    return NextResponse.redirect(`${appUrl}/settings?github_connected=success`);
  } catch (error) {
    console.error('Failed to handle GitHub App installation callback:', error);
    return NextResponse.redirect(`${appUrl}/settings?error=connection_callback_failed`);
  }
}
