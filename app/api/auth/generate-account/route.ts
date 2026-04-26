import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { generateAccountNumber } from '@/lib/auth/generateAccount';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// max 5 account creations per IP per hour
async function checkRateLimit(ip: string): Promise<boolean> {
  const key = `rl:generate-account:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60 * 60);
  return count <= 5;
}

// ---------------------------------------------------------------------------
// POST /api/auth/generate-account
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (!(await checkRateLimit(ip))) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429 }
    );
  }

  const accountNumber = generateAccountNumber();

  await db.insert(users).values({ accountNumber });

  return NextResponse.json({ accountNumber });
}
