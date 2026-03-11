import { NextRequest, NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { blocks, companies } from '@/db/schema';
import { verifyApiKey, requireTier } from '@/lib/api/auth';
import { checkRateLimit } from '@/lib/api/rateLimiting';
import { logRequest } from '@/lib/api/audit';
import { addWatermark } from '@/lib/api/watermark';
import { VIOLATION_CATEGORIES, VIOLATION_TAGS } from '@/db/schema';
import type { ViolationCategory, ViolationTag } from '@/db/schema';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  let apiKey = '';

  try {
    const client = await verifyApiKey(request);
    apiKey = client.apiKey;

    requireTier(client, ['PROFESSIONAL', 'ENTERPRISE']);

    const { allowed, remaining } = checkRateLimit(client.apiKey, client.tier);
    if (!allowed) {
      await logRequest(client.apiKey, '/api/v1/compare', null, null, ip, null, 429);
      return NextResponse.json(addWatermark({ error: 'Rate limit exceeded' }, client), { status: 429 });
    }

    const tickersParam = request.nextUrl.searchParams.get('tickers') ?? '';
    const tickers = tickersParam
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 5);

    if (tickers.length < 2) {
      await logRequest(client.apiKey, '/api/v1/compare', null, null, ip, null, 400);
      return NextResponse.json(
        addWatermark({ error: 'Provide at least 2 tickers (max 5)' }, client),
        { status: 400 },
      );
    }

    const companyRows = await db
      .select({ id: companies.id, name: companies.name, ticker: companies.ticker })
      .from(companies)
      .where(inArray(companies.ticker, tickers));

    if (companyRows.length === 0) {
      await logRequest(client.apiKey, '/api/v1/compare', null, null, ip, null, 404);
      return NextResponse.json(addWatermark({ error: 'No matching companies found' }, client), { status: 404 });
    }

    const companyIds = companyRows.map((c) => c.id);
    const blockRows = await db
      .select({
        companyId: blocks.companyId,
        category: blocks.category,
        violationTag: blocks.violationTag,
        amount: blocks.amount,
      })
      .from(blocks)
      .where(inArray(blocks.companyId, companyIds));

    const comparison = companyRows.map((co) => {
      const coBlocks = blockRows.filter((b) => b.companyId === co.id);

      const byCategory = Object.fromEntries(
        VIOLATION_CATEGORIES.map((c) => [c, 0]),
      ) as Record<ViolationCategory, number>;

      const bySeverity = Object.fromEntries(
        VIOLATION_TAGS.map((t) => [t, 0]),
      ) as Record<ViolationTag, number>;

      let totalFines = 0;
      for (const b of coBlocks) {
        byCategory[b.category] = (byCategory[b.category] ?? 0) + 1;
        bySeverity[b.violationTag] = (bySeverity[b.violationTag] ?? 0) + 1;
        totalFines += b.amount ?? 0;
      }

      return {
        ticker: co.ticker,
        name: co.name,
        violationCount: coBlocks.length,
        totalFines,
        byCategory,
        bySeverity,
      };
    });

    await logRequest(client.apiKey, '/api/v1/compare', tickers.join(','), null, ip, null, 200);

    return NextResponse.json(
      addWatermark({ comparison }, client),
      { headers: { 'X-RateLimit-Remaining': String(remaining) } },
    );
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Internal error';
    if (apiKey) await logRequest(apiKey, '/api/v1/compare', null, null, ip, null, status).catch(() => {});
    return NextResponse.json({ error: message }, { status });
  }
}
