import { App } from 'octokit';
import prisma from './db';

const appId = process.env.GITHUB_APP_ID;
const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

// Check configuration
const hasAppConfig = !!appId && !!privateKey;

const app = hasAppConfig
  ? new App({
      appId: appId!,
      privateKey: privateKey!.replace(/\\n/g, '\n'), // Handle environment variable newlines
    })
  : null;

/**
 * Retrieves an authenticated Octokit client instance for a given GitHub App installation.
 */
export async function getInstallationClient(installationId: string) {
  if (installationId.startsWith('mock-')) {
    return {
      rest: {
        apps: {
          listReposAccessibleToInstallation: async () => {
            return {
              data: {
                repositories: [
                  { id: 101, name: 'react-dashboard', full_name: 'acme/react-dashboard' },
                  { id: 102, name: 'api-service', full_name: 'acme/api-service' },
                  { id: 103, name: 'docs-site', full_name: 'acme/docs-site' },
                ],
              },
            };
          },
        },
        repos: {
          listCommits: async () => {
            return { data: [] };
          },
        },
        pulls: {
          list: async () => {
            return { data: [] };
          },
          listReviews: async () => {
            return { data: [] };
          },
        },
      },
    } as unknown as never;
  }

  if (!app) {
    throw new Error('GitHub App is not fully configured (GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY is missing)');
  }
  return await app.getInstallationOctokit(Number(installationId));
}

interface RepoMetadata {
  owner: string;
  repo: string;
  githubInstallationId: string;
}

/**
 * Resolves repository details and workspace installation details from the DB.
 */
async function getRepoMetadata(repoId: string): Promise<RepoMetadata> {
  const repository = await prisma.repository.findUnique({
    where: { id: repoId },
    include: {
      team: true,
    },
  });

  if (!repository) {
    throw new Error(`Repository with ID ${repoId} not found`);
  }

  // Split fullName (e.g., "owner/repo-name") to get owner and repo name
  const [owner, repo] = repository.fullName.split('/');
  
  // In Phase 2, we store githubOrg as installation_id or fetch it.
  // We assume team.githubOrg stores the GitHub App installation ID once connected.
  const githubInstallationId = repository.team.githubOrg;
  if (!githubInstallationId) {
    throw new Error(`Team workspace for repository ${repository.name} is not connected to GitHub`);
  }

  return { owner, repo, githubInstallationId };
}

/**
 * Synchronizes commits for a repository.
 */
export async function syncCommits(repoId: string, since?: string) {
  try {
    const { owner, repo, githubInstallationId } = await getRepoMetadata(repoId);
    const octokit = await getInstallationClient(githubInstallationId);

    // List commits from GitHub API
    const response = await octokit.rest.repos.listCommits({
      owner,
      repo,
      since,
      per_page: 100,
    });

    const commitsData = response.data;

    // Batch upsert commits in a database transaction
    const upserts = commitsData.map((commit) => {
      const timestamp = commit.commit.committer?.date || commit.commit.author?.date;
      return prisma.commit.upsert({
        where: { sha: commit.sha },
        update: {
          message: commit.commit.message,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          authorId: commit.author?.login || commit.commit.author?.name || 'unknown',
        },
        create: {
          repoId,
          sha: commit.sha,
          message: commit.commit.message,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          authorId: commit.author?.login || commit.commit.author?.name || 'unknown',
        },
      });
    });

    await Promise.all(upserts);
    console.log(`Successfully synchronized ${commitsData.length} commits for repository: ${owner}/${repo}`);
  } catch (error) {
    console.error(`Failed to sync commits for repo ${repoId}:`, error);
    throw error;
  }
}

/**
 * Synchronizes pull requests and their reviews for a repository.
 */
export async function syncPullRequests(repoId: string) {
  try {
    const { owner, repo, githubInstallationId } = await getRepoMetadata(repoId);
    const octokit = await getInstallationClient(githubInstallationId);

    // List PRs from GitHub API (fetch both open and closed/merged PRs)
    const response = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'all',
      per_page: 50,
    });

    const prsData = response.data;

    for (const pr of prsData) {
      const createdAt = new Date(pr.created_at);
      const mergedAt = pr.merged_at ? new Date(pr.merged_at) : null;
      
      // Calculate cycle time in hours if merged
      let cycleTimeHours: number | null = null;
      if (mergedAt) {
        cycleTimeHours = (mergedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      }

      // 1. Upsert PR details
      const dbPr = await prisma.pullRequest.upsert({
        where: {
          repoId_githubPrId: {
            repoId,
            githubPrId: String(pr.number),
          },
        },
        update: {
          title: pr.title,
          state: pr.state === 'closed' && pr.merged_at ? 'merged' : pr.state,
          cycleTimeHours,
          mergedAt,
        },
        create: {
          repoId,
          githubPrId: String(pr.number),
          title: pr.title,
          state: pr.state === 'closed' && pr.merged_at ? 'merged' : pr.state,
          cycleTimeHours,
          createdAt,
          mergedAt,
        },
      });

      // 2. Fetch reviews for each PR
      try {
        const reviewsResponse = await octokit.rest.pulls.listReviews({
          owner,
          repo,
          pull_number: pr.number,
        });

        const reviewsData = reviewsResponse.data;

        // Batch upsert reviews in a database transaction
        const reviewUpserts = reviewsData.map((review) => {
          return prisma.prReview.upsert({
            where: { id: String(review.id) },
            update: {
              state: review.state.toLowerCase(),
              submittedAt: review.submitted_at ? new Date(review.submitted_at) : new Date(),
            },
            create: {
              id: String(review.id),
              prId: dbPr.id,
              reviewerId: review.user?.login || 'unknown',
              submittedAt: review.submitted_at ? new Date(review.submitted_at) : new Date(),
              state: review.state.toLowerCase(),
            },
          });
        });

        await Promise.all(reviewUpserts);
      } catch (reviewErr) {
        console.error(`Failed to sync reviews for PR ${pr.number} in repo ${repoId}:`, reviewErr);
      }
    }

    console.log(`Successfully synchronized ${prsData.length} pull requests for repository: ${owner}/${repo}`);
  } catch (error) {
    console.error(`Failed to sync pull requests for repo ${repoId}:`, error);
    throw error;
  }
}
