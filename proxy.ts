import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// TODO Phase 3: Implement sliding-window rate limiting.
// Recommended approach: use an edge-compatible KV store (e.g. Upstash Redis)
// with a token bucket or fixed-window counter keyed by hashed IP.
// Return 429 with Retry-After header when limit is exceeded.

export function proxy(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  // Stub: pass all requests through; log the IP for future rate-limit wiring.
  const response = NextResponse.next();
  response.headers.set('X-OMEN-Version', '0.1.0');

  void ip; // referenced above, will be used when rate limiting is implemented

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
