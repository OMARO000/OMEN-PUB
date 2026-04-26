import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { blocks, companies } from '@/db/schema';
import { verifyApiKey, requireTier } from '@/lib/api/auth';
import { checkRateLimit } from '@/lib/api/rateLimiting';
import { logRequest, detectPatterns } from '@/lib/api/audit';
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

    const { allowed, remaining } = await checkRateLimit(client.apiKey, client.tier);
    if (!allowed) {
      await logRequest(client.apiKey, '/api/v1/summarize', null, null, ip, null, 429);
      return NextResponse.json(addWatermark({ error: 'Rate limit exceeded' }, client), { status: 429 });
    }

    const ticker = (request.nextUrl.searchParams.get('ticker') ?? '').toUpperCase();
    const category = request.nextUrl.searchParams.get('category') as ViolationCategory | null;

    if (!ticker) {
      await logRequest(client.apiKey, '/api/v1/summarize', null, null, ip, null, 400);
      return NextResponse.json(addWatermark({ error: 'ticker parameter required' }, client), { status: 400 });
    }

    const coRows = await db
      .select({ id: companies.id, name: companies.name, ticker: companies.ticker })
      .from(companies)
      .where(eq(companies.ticker, ticker))
      .limit(1);

    if (coRows.length === 0) {
      await logRequest(client.apiKey, '/api/v1/summarize', ticker, null, ip, null, 404);
      return NextResponse.json(addWatermark({ error: 'Company not found' }, client), { status: 404 });
    }

    const company = coRows[0];

    const conditions = [eq(blocks.companyId, company.id)];
    if (category) conditions.push(eq(blocks.category, category));

    const blockRows = await db
      .select({
        blockId: blocks.blockId,
        category: blocks.category,
        violationTag: blocks.violationTag,
        title: blocks.title,
        formalSummary: blocks.formalSummary,
        amount: blocks.amount,
        violationDate: blocks.violationDate,
        regulatoryBasis: blocks.regulatoryBasis,
        jurisdiction: blocks.jurisdiction,
      })
      .from(blocks)
      .where(and(...conditions));

    const byCategory = Object.fromEntries(
      VIOLATION_CATEGORIES.map((c) => [c, 0]),
    ) as Record<ViolationCategory, number>;

    const bySeverity = Object.fromEntries(
      VIOLATION_TAGS.map((t) => [t, 0]),
    ) as Record<ViolationTag, number>;

    let totalFines = 0;
    const jurisdictions = new Set<string>();
    const regulatoryBases = new Set<string>();

    for (const b of blockRows) {
      byCategory[b.category] = (byCategory[b.category] ?? 0) + 1;
      bySeverity[b.violationTag] = (bySeverity[b.violationTag] ?? 0) + 1;
      totalFines += b.amount ?? 0;
      if (b.jurisdiction) jurisdictions.add(b.jurisdiction);
      if (b.regulatoryBasis) regulatoryBases.add(b.regulatoryBasis);
    }

    const summary = {
      company: { name: company.name, ticker: company.ticker },
      category: category ?? 'ALL',
      totalViolations: blockRows.length,
      totalFines,
      byCategory,
      bySeverity,
      jurisdictions: [...jurisdictions],
      regulatoryBases: [...regulatoryBases],
      violations: blockRows.map((b) => ({
        blockId: b.blockId,
        category: b.category,
        violationTag: b.violationTag,
        title: b.title,
        formalSummary: b.formalSummary,
        amount: b.amount,
        violationDate: b.violationDate,
      })),
    };

    await logRequest(client.apiKey, '/api/v1/summarize', ticker, category, ip, null, 200);
    await detectPatterns(client.apiKey, ticker);

    return NextResponse.json(
      addWatermark(summary, client),
      { headers: { 'X-RateLimit-Remaining': String(remaining) } },
    );
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Internal error';
    if (apiKey) await logRequest(apiKey, '/api/v1/summarize', null, null, ip, null, status).catch(() => {});
    return NextResponse.json({ error: message }, { status });
  }
}
