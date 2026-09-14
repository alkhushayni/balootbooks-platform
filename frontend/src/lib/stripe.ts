import Stripe from "stripe";

// apiVersion is intentionally omitted - the installed SDK pins its own bundled default, which is
// safer than hand-typing a version string that could drift from what's actually installed.
export function createStripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

// A single flat price for digital textbook access - this app has no per-course Stripe
// product/price catalog, so a configurable-with-fallback amount is the simplest faithful
// implementation. Override via STRIPE_COURSE_PRICE_CENTS in .env.local.
export function getCoursePriceCents(): number {
  const configured = Number(process.env.STRIPE_COURSE_PRICE_CENTS);
  return Number.isFinite(configured) && configured > 0 ? configured : 4999;
}
