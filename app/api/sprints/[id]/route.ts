import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { z } from 'zod';

export const sprintUpdateSchema = z.object({
  name: z.string().min(1, 'Sprint name is required').max(100, 'Sprint name is too long').optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  velocity: z.number().int().nonnegative('Target velocity must be 0 or greater').optional(),
});

type Context = {
  params: Promise<{ id: string }>;
};

export async function DELETE(
  request: NextRequest,
  context: Context
) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    // 1. Fetch the sprint to identify its teamId
    const sprint = await prisma.sprint.findUnique({
      where: { id },
    });

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    // 2. Verify user is an Admin of the team
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: sprint.teamId,
          userId: user.userId,
        },
      },
    });

    if (!membership || membership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only team administrators can delete sprints' }, { status: 403 });
    }

    // 3. Delete the sprint
    await prisma.sprint.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Sprint deleted successfully' });
  } catch (error) {
    console.error('Failed to delete sprint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: Context
) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const result = sprintUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    // 1. Fetch the sprint to identify its teamId and existing dates
    const sprint = await prisma.sprint.findUnique({
      where: { id },
    });

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    // 2. Verify user is an Admin of the team
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: sprint.teamId,
          userId: user.userId,
        },
      },
    });

    if (!membership || membership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only team administrators can update sprints' }, { status: 403 });
    }

    const { name, startDate, endDate, velocity } = result.data;

    // Validate dates if they are being updated
    const finalStartDate = startDate || sprint.startDate;
    const finalEndDate = endDate || sprint.endDate;

    if (finalStartDate >= finalEndDate) {
      return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 });
    }

    // 3. Update the sprint
    const updatedSprint = await prisma.sprint.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        startDate: startDate !== undefined ? startDate : undefined,
        endDate: endDate !== undefined ? endDate : undefined,
        velocity: velocity !== undefined ? velocity : undefined,
      },
    });

    return NextResponse.json({ sprint: updatedSprint });
  } catch (error) {
    console.error('Failed to update sprint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
