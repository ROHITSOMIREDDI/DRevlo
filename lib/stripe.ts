import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Initialize Stripe. If the secret key is missing, we allow it to be null
// and handle the fallback in the API endpoints to facilitate mock testing.
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acme' as unknown as never,
    })
  : null;

/**
 * Checks if Stripe is properly configured.
 */
export function isStripeConfigured(): boolean {
  return !!stripe;
}
