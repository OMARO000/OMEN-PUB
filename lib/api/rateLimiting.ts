import type { ApiTier } from '@/db/schema';

// Safeguard 3: Tier-based rate limiting
const LIMITS: Record<ApiTier, number> = {
  STARTER: 10,
  PROFESSIONAL: 50,
  ENTERPRISE: 500,
  RESTRICTED: 5,
};

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

export function checkRateLimit(
  apiKey: string,
  tier: ApiTier,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 60_000; // 1 minute
  const limit = LIMITS[tier];

  const existing = store.get(apiKey);

  if (!existing || now > existing.resetAt) {
    store.set(apiKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count };
}
