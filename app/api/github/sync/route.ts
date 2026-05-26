import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { syncCommits, syncPullRequests } from '@/lib/github';
import { z } from 'zod';

const syncSchema = z.object({
  teamId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = syncSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { teamId } = result.data;

    // 1. Verify user is ADMIN of the team
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.userId,
        },
      },
    });

    if (!membership || membership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only team admins can trigger sync' }, { status: 403 });
    }

    // 2. Fetch all repositories for this team
    const repositories = await prisma.repository.findMany({
      where: { teamId },
    });

    if (repositories.length === 0) {
      return NextResponse.json({ success: true, message: 'No repositories connected to sync' });
    }

    // 3. Trigger synchronization for each repository
    const syncPromises = repositories.flatMap((repo) => [
      syncCommits(repo.id),
      syncPullRequests(repo.id),
    ]);

    await Promise.all(syncPromises);

    return NextResponse.json({ success: true, message: `Synchronized ${repositories.length} repositories` });
  } catch (error) {
    console.error('Manual repository synchronization failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
