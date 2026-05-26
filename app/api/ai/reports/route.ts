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

    // 2. Fetch AI reports ordered by generation date
    const reports = await prisma.aiReport.findMany({
      where: { teamId },
      orderBy: { generatedAt: 'desc' },
      take: 30,
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Failed to retrieve AI reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
