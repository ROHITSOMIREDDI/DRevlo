import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { z } from 'zod';

const updateTeamSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(50).optional(),
  timezone: z.string().min(1, 'Timezone is required').optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: teamId } = await params;

  try {
    // 1. Verify user is an Admin of the team
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.userId,
        },
      },
    });

    if (!membership || membership.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only team administrators can update settings' },
        { status: 403 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const result = updateTeamSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, timezone } = result.data;

    // 3. Update team configuration
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: name !== undefined ? name : undefined,
        timezone: timezone !== undefined ? timezone : undefined,
      },
    });

    return NextResponse.json(updatedTeam);
  } catch (error) {
    console.error('Failed to update team settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: teamId } = await params;

  try {
    // Verify user belongs to the team
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.userId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Forbidden: You do not belong to this team' },
        { status: 403 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            plan: true,
            stripeCustomerId: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        repositories: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error('Failed to fetch team details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
