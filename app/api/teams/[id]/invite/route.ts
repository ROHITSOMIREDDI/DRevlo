import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: teamId } = await params;

  try {
    // 1. Verify requester is an ADMIN of the team
    const requesterMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.userId,
        },
      },
    });

    if (!requesterMembership || requesterMembership.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only team admins can invite members' },
        { status: 403 }
      );
    }

    // 2. Parse and validate invite body
    const body = await request.json();
    const result = inviteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, role } = result.data;

    // 3. Find user by email
    const invitee = await prisma.user.findUnique({
      where: { email },
    });

    if (!invitee) {
      return NextResponse.json(
        { error: 'User not found. Ask them to sign in to Drevlo first' },
        { status: 404 }
      );
    }

    // 4. Check if invitee is already a member
    const existingMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: invitee.id,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of this workspace' },
        { status: 400 }
      );
    }

    // 5. Create membership
    const membership = await prisma.teamMember.create({
      data: {
        teamId,
        userId: invitee.id,
        role,
      },
    });

    return NextResponse.json({
      success: true,
      membership: {
        id: membership.id,
        teamId: membership.teamId,
        userId: membership.userId,
        role: membership.role,
        email: invitee.email,
        name: invitee.name,
      },
    });
  } catch (error) {
    console.error('Failed to invite member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
