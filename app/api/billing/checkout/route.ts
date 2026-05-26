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
    const priceId = process.env.STRIPE_PRO_PRICE_ID;

    // Fetch user details from DB
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Local mock fallback if Stripe is not configured
    if (!stripe || !priceId) {
      console.log('Stripe or Price ID not configured. Mocking PRO plan upgrade.');

      // Update user plan
      await prisma.user.update({
        where: { id: user.userId },
        data: { plan: 'PRO' },
      });

      // Upsert mock subscription
      await prisma.subscription.upsert({
        where: { stripeSubId: `mock_sub_${teamId}` },
        update: {
          plan: 'PRO',
          status: 'ACTIVE',
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        create: {
          userId: user.userId,
          stripeSubId: `mock_sub_${teamId}`,
          plan: 'PRO',
          status: 'ACTIVE',
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return NextResponse.json({ url: `${appUrl}/settings?billing=success` });
    }

    // 3. Create or resolve Stripe Customer ID
    let customerId = dbUser.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: dbUser.email,
        name: dbUser.name || undefined,
        metadata: { userId: dbUser.id },
      });
      customerId = customer.id;

      await prisma.user.update({
        where: { id: dbUser.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // 4. Calculate subscription quantity (seat-based billing: $9/user/month)
    const membersCount = await prisma.teamMember.count({
      where: { teamId },
    });
    const quantity = Math.max(1, membersCount);

    // 5. Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      success_url: `${appUrl}/settings?session_id={CHECKOUT_SESSION_ID}&billing=success`,
      cancel_url: `${appUrl}/settings?billing=cancel`,
      metadata: {
        userId: dbUser.id,
        teamId,
        membersCount: String(quantity),
      },
      subscription_data: {
        metadata: {
          teamId,
          userId: dbUser.id,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout session creation failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
