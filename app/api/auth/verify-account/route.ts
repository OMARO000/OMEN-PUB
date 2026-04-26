import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/db/schema';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// max 10 attempts per IP per hour
async function checkRateLimit(ip: string): Promise<boolean> {
  const key = `rl:verify-account:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60 * 60);
  return count <= 10;
}

// ---------------------------------------------------------------------------
// GET /api/auth/verify-account — session check (used by pay page)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const session = request.cookies.get('omen_session')?.value;
  if (!session) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
  return NextResponse.json({ valid: true });
}

// ---------------------------------------------------------------------------
// POST /api/auth/verify-account
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (!(await checkRateLimit(ip))) {
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
    .select({ id: users.id, accountNumber: users.accountNumber, isPaid: users.isPaid })
    .from(users)
    .where(eq(users.accountNumber, normalized))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ valid: false, isPaid: false });
  }

  const response = NextResponse.json({ valid: true, isPaid: rows[0].isPaid ?? false });

  response.cookies.set('omen_session', normalized, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return response;
}
