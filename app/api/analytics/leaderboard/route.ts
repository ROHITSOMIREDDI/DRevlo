import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

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

    // 2. Fetch commit counts grouped by authorId
    const commitGroups = await prisma.commit.groupBy({
      by: ['authorId'],
      where: {
        repository: {
          teamId,
        },
      },
      _count: {
        id: true,
      },
    });

    // 3. Fetch review counts grouped by reviewerId
    const reviewGroups = await prisma.prReview.groupBy({
      by: ['reviewerId'],
      where: {
        pullRequest: {
          repository: {
            teamId,
          },
        },
      },
      _count: {
        id: true,
      },
    });

    // 4. Map authors and calculate scores
    const developerMap: { [username: string]: { commits: number; reviews: number; prs: number } } = {};

    commitGroups.forEach((g) => {
      const username = g.authorId;
      if (!developerMap[username]) {
        developerMap[username] = { commits: 0, reviews: 0, prs: 0 };
      }
      developerMap[username].commits = g._count.id;
    });

    reviewGroups.forEach((g) => {
      const username = g.reviewerId;
      if (!developerMap[username]) {
        developerMap[username] = { commits: 0, reviews: 0, prs: 0 };
      }
      developerMap[username].reviews = g._count.id;
    });

    // Generate leaderboard members
    const membersList = Object.keys(developerMap).map((username) => {
      const stats = developerMap[username];
      
      // Calculate weighted activity index score
      // Commit = 1 pt, Review = 3 pts
      const score = stats.commits * 1 + stats.reviews * 3;

      return {
        userId: username,
        name: username,
        commits: stats.commits,
        prs: 0, // PR author not tracked in database in this version, default to 0
        reviews: stats.reviews,
        score,
      };
    });

    // Sort by score descending
    membersList.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      members: membersList,
    });
  } catch (error) {
    console.error('Failed to calculate leaderboard data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
