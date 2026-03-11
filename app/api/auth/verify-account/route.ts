import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/db/schema';

// ---------------------------------------------------------------------------
// In-memory rate limiter — max 10 attempts per IP per hour
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 10;

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

// ---------------------------------------------------------------------------
// POST /api/auth/verify-account
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429 }
    );
  }

  const body = await request.json();
  const raw: string = typeof body.accountNumber === 'string' ? body.accountNumber : '';

  // Strip dashes, validate exactly 16 digits
  const digits = raw.replace(/-/g, '');
  if (!/^\d{16}$/.test(digits)) {
    return NextResponse.json({ valid: false, isPaid: false });
  }

  // Normalize to XXXX-XXXX-XXXX-XXXX
  const normalized = `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12, 16)}`;

  const rows = await db
    .select({ id: users.id, accountNumber: users.accountNumber })
    .from(users)
    .where(eq(users.accountNumber, normalized))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ valid: false, isPaid: false });
  }

  // isPaid: Stripe integration deferred to Phase 5 — always false until then
  const response = NextResponse.json({ valid: true, isPaid: false });

  response.cookies.set('omen_session', normalized, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return response;
}
