import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json({ error: 'Missing teamId parameter' }, { status: 400 });
    }

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
        { error: 'Forbidden: Only team administrators can manage billing' },
        { status: 403 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Fetch user details from DB
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Local mock fallback if Stripe is not configured
    if (!stripe) {
      console.log('Stripe not configured. Returning mock billing portal URL.');
      return NextResponse.json({ url: `${appUrl}/settings?billing=portal_mock` });
    }

    const customerId = dbUser.stripeCustomerId;
    if (!customerId) {
      return NextResponse.json(
        { error: 'No active billing profile found for your account. Please subscribe first.' },
        { status: 400 }
      );
    }

    // 3. Create Stripe Billing Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe billing portal session creation failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
