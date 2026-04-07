import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2026-02-25.clover',
  });
  const accountNumber = request.cookies.get('omen_session')?.value;

  if (!accountNumber) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { accountNumber },
    success_url: `${baseUrl}/dashboard?activated=true`,
    cancel_url: `${baseUrl}/dashboard/pay`,
  });

  return NextResponse.json({ url: session.url });
}
