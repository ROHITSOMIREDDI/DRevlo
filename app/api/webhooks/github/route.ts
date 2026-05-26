import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Validates the GitHub webhook signature using HMAC-SHA256.
 */
function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error('GITHUB_WEBHOOK_SECRET is not configured');
    return false;
  }
  if (!signature) return false;

  const hmac = createHmac('sha256', secret);
  const expectedSignature = `sha256=${hmac.update(rawBody).digest('hex')}`;

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  // Verify signature
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  const eventType = request.headers.get('x-github-event');
  const payload = JSON.parse(rawBody);

  try {
    const githubRepoId = String(payload.repository?.id);
    if (!githubRepoId) {
      return NextResponse.json({ error: 'Missing repository ID in payload' }, { status: 400 });
    }

    // Find if the repository is connected to any team workspace in Drevlo
    const repository = await prisma.repository.findFirst({
      where: { githubRepoId },
    });

    if (!repository) {
      // Not tracking this repository, return 200 OK (ignored)
      return NextResponse.json({ success: true, message: 'Repository not tracked' });
    }

    const repoId = repository.id;

    // 1. Process PUSH event (Commits)
    if (eventType === 'push') {
      const commits = payload.commits || [];
      const upserts = commits.map((commit: any) => {
        return prisma.commit.upsert({
          where: { sha: commit.id },
          update: {
            message: commit.message,
            timestamp: new Date(commit.timestamp),
            authorId: commit.author?.username || commit.author?.name || 'unknown',
          },
          create: {
            repoId,
            sha: commit.id,
            message: commit.message,
            timestamp: new Date(commit.timestamp),
            authorId: commit.author?.username || commit.author?.name || 'unknown',
          },
        });
      });
      await Promise.all(upserts);
      return NextResponse.json({ success: true, message: `Processed ${commits.length} commits` });
    }

    // 2. Process PULL_REQUEST event
    if (eventType === 'pull_request') {
      const pr = payload.pull_request;
      const action = payload.action;

      if (!pr) {
        return NextResponse.json({ error: 'Missing pull request payload' }, { status: 400 });
      }

      const githubPrId = String(pr.number);
      const createdAt = new Date(pr.created_at);
      const mergedAt = pr.merged_at ? new Date(pr.merged_at) : null;
      
      let cycleTimeHours: number | null = null;
      if (mergedAt) {
        cycleTimeHours = (mergedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      }

      let state = pr.state; // "open" or "closed"
      if (pr.merged) {
        state = 'merged';
      }

      await prisma.pullRequest.upsert({
        where: {
          repoId_githubPrId: {
            repoId,
            githubPrId,
          },
        },
        update: {
          title: pr.title,
          state,
          cycleTimeHours,
          mergedAt,
        },
        create: {
          repoId,
          githubPrId,
          title: pr.title,
          state,
          cycleTimeHours,
          createdAt,
          mergedAt,
        },
      });

      return NextResponse.json({ success: true, message: `Processed PR #${githubPrId} (${action})` });
    }

    // 3. Process PULL_REQUEST_REVIEW event
    if (eventType === 'pull_request_review') {
      const pr = payload.pull_request;
      const review = payload.review;

      if (!pr || !review) {
        return NextResponse.json({ error: 'Missing pull request or review payload' }, { status: 400 });
      }

      const githubPrId = String(pr.number);

      // Find the corresponding PR record
      const dbPr = await prisma.pullRequest.findUnique({
        where: {
          repoId_githubPrId: {
            repoId,
            githubPrId,
          },
        },
      });

      if (!dbPr) {
        return NextResponse.json({ error: 'Pull request not found in database' }, { status: 404 });
      }

      await prisma.prReview.upsert({
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

      return NextResponse.json({ success: true, message: `Processed review ${review.id} for PR #${githubPrId}` });
    }

    return NextResponse.json({ success: true, message: `Unhandle event type: ${eventType}` });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
