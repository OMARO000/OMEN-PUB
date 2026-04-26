import { Redis } from '@upstash/redis';
import type { ApiTier } from '@/db/schema';

const LIMITS: Record<ApiTier, number> = {
  STARTER: 10,
  PROFESSIONAL: 50,
  ENTERPRISE: 500,
  RESTRICTED: 5,
};

const WINDOW_SECONDS = 60;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function checkRateLimit(
  apiKey: string,
  tier: ApiTier,
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = LIMITS[tier];
  const key = `rl:api:${apiKey}`;

  const count = await redis.incr(key);

  // Set TTL only on the first request in a window
  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }

  if (count > limit) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: limit - count };
}
