import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyJWT } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('drevlo_access');

  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await verifyJWT(sessionCookie.value);

  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        memberships: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        githubId: user.githubId,
        plan: user.plan,
        createdAt: user.createdAt,
        memberships: user.memberships.map((m) => ({
          teamId: m.teamId,
          role: m.role,
          teamName: m.team.name,
          teamSlug: m.team.slug,
          githubOrg: m.team.githubOrg,
        })),
      },
    });
  } catch (error) {
    console.error('Failed to retrieve user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
