import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { sendTeamInvitationEmail } from '@/lib/email';
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

    // 1.5 Verify Free Tier Limits
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { owner: true },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team workspace not found' }, { status: 404 });
    }

    const currentMembersCount = await prisma.teamMember.count({
      where: { teamId },
    });

    if (team.owner.plan === 'FREE' && currentMembersCount >= 3) {
      return NextResponse.json(
        { error: 'Workspace limit reached: Free tier is limited to 3 team members. Please upgrade to Pro.' },
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${appUrl}/team`;
    try {
      await sendTeamInvitationEmail(invitee.email, team.name, inviteLink);
    } catch (emailErr) {
      console.error('Failed to send invitation email:', emailErr);
    }

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
