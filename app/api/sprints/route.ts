import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { z } from 'zod';

export const sprintCreateSchema = z.object({
  teamId: z.string().uuid(),
  name: z.string().min(1, 'Sprint name is required').max(100, 'Sprint name is too long'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  velocity: z.number().int().nonnegative('Target velocity must be 0 or greater').default(0),
}).refine(data => data.startDate < data.endDate, {
  message: 'Start date must be before end date',
  path: ['startDate'],
});

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
      return NextResponse.json({ error: 'Forbidden: You do not belong to this team' }, { status: 403 });
    }

    // Fetch all sprints for the team
    const sprints = await prisma.sprint.findMany({
      where: { teamId },
      orderBy: { endDate: 'desc' },
    });

    // Calculate actual velocity (merged PR count) for each sprint
    const sprintsWithActualVelocity = await Promise.all(
      sprints.map(async (sprint) => {
        const actualVelocity = await prisma.pullRequest.count({
          where: {
            repository: { teamId },
            state: 'merged',
            mergedAt: {
              gte: sprint.startDate,
              lte: sprint.endDate,
            },
          },
        });

        return {
          ...sprint,
          actualVelocity,
        };
      })
    );

    return NextResponse.json({ sprints: sprintsWithActualVelocity });
  } catch (error) {
    console.error('Failed to fetch sprints:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = sprintCreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { teamId, name, startDate, endDate, velocity } = result.data;

    // Verify user is an Admin of the team
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.userId,
        },
      },
    });

    if (!membership || membership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only team administrators can create sprints' }, { status: 403 });
    }

    // Create the sprint
    const newSprint = await prisma.sprint.create({
      data: {
        teamId,
        name,
        startDate,
        endDate,
        velocity, // Target velocity
      },
    });

    return NextResponse.json({ sprint: newSprint }, { status: 201 });
  } catch (error) {
    console.error('Failed to create sprint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
