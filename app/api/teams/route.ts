import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { z } from 'zod';

const createTeamSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(50),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters long')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = createTeamSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, slug } = result.data;

    // Check if slug is unique
    const existingTeam = await prisma.team.findUnique({
      where: { slug },
    });

    if (existingTeam) {
      return NextResponse.json(
        { error: 'Workspace URL slug is already in use' },
        { status: 400 }
      );
    }

    // Create team and team member relationships in a database transaction
    const newTeam = await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name,
          slug,
          ownerId: user.userId,
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId: user.userId,
          role: 'ADMIN',
        },
      });

      return team;
    });

    return NextResponse.json(newTeam, { status: 201 });
  } catch (error) {
    console.error('Failed to create team workspace:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
