import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

interface StripeSubscription {
  current_period_end: number;
  id: string;
  customer: string;
  status: string;
}

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (stripe && webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      // In development when keys are not configured, allow unverified payload for testing
      event = JSON.parse(payload);
      console.warn('Stripe Webhook signature check skipped: Stripe is not configured or Webhook Secret is missing.');
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Stripe Webhook signature verification failed: ${errorMessage}`);
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
  }

  const eventType = event.type;
  console.log(`Received Stripe webhook event: ${eventType}`);

  try {
    // 1. Handle checkout session completion
    if (eventType === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = session.subscription as string;
      const customerId = session.customer as string;
      const userId = session.metadata?.userId;
      const teamId = session.metadata?.teamId;

      if (userId && subscriptionId && stripe) {
        // Fetch detailed subscription details from Stripe
        const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as StripeSubscription;
        const periodEnd = new Date(subscription.current_period_end * 1000);

        // Update User plan to PRO
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: 'PRO',
            stripeCustomerId: customerId,
          },
        });

        // Upsert subscription details
        await prisma.subscription.upsert({
          where: { stripeSubId: subscriptionId },
          update: {
            plan: 'PRO',
            status: 'ACTIVE',
            periodEnd: periodEnd,
          },
          create: {
            userId: userId,
            stripeSubId: subscriptionId,
            plan: 'PRO',
            status: 'ACTIVE',
            periodEnd: periodEnd,
          },
        });

        console.log(`Successfully provisioned PRO subscription for user ${userId} and team ${teamId}`);
      }
    }

    // 2. Handle subscription creation / updates
    if (eventType === 'customer.subscription.created' || eventType === 'customer.subscription.updated') {
      const subscription = event.data.object as unknown as StripeSubscription;
      const subscriptionId = subscription.id;
      const customerId = subscription.customer as string;
      const status = subscription.status; // active, past_due, trialing, etc.
      const periodEnd = new Date(subscription.current_period_end * 1000);

      // Find the user with this customerId
      const user = await prisma.user.findUnique({
        where: { stripeCustomerId: customerId },
      });

      if (user) {
        const stripeStatusMap: Record<string, 'ACTIVE' | 'PAST_DUE' | 'CANCELLED'> = {
          active: 'ACTIVE',
          trialing: 'ACTIVE',
          past_due: 'PAST_DUE',
          unpaid: 'PAST_DUE',
          canceled: 'CANCELLED',
          incomplete: 'PAST_DUE',
        };

        const mappedStatus = stripeStatusMap[status] || 'ACTIVE';

        // Update Subscription status
        await prisma.subscription.upsert({
          where: { stripeSubId: subscriptionId },
          update: {
            status: mappedStatus,
            periodEnd: periodEnd,
          },
          create: {
            userId: user.id,
            stripeSubId: subscriptionId,
            plan: user.plan,
            status: mappedStatus,
            periodEnd: periodEnd,
          },
        });

        // Sync user plan level
        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: mappedStatus === 'ACTIVE' ? 'PRO' : 'FREE',
          },
        });

        console.log(`Updated subscription ${subscriptionId} for user ${user.id} to status ${mappedStatus}`);
      }
    }

    // 3. Handle subscription deletion / cancellations
    if (eventType === 'customer.subscription.deleted') {
      const subscription = event.data.object as unknown as StripeSubscription;
      const subscriptionId = subscription.id;
      const customerId = subscription.customer as string;

      const user = await prisma.user.findUnique({
        where: { stripeCustomerId: customerId },
      });

      if (user) {
        // Downgrade User plan to FREE
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: 'FREE' },
        });

        // Set Subscription record status to CANCELLED
        await prisma.subscription.update({
          where: { stripeSubId: subscriptionId },
          data: {
            status: 'CANCELLED',
            plan: 'FREE',
          },
        });

        console.log(`Cancelled subscription ${subscriptionId} for user ${user.id} and set plan to FREE`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Stripe webhook handling failed:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
