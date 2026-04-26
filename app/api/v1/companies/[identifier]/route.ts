import { NextRequest, NextResponse } from 'next/server';
import { eq, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { blocks, companies } from '@/db/schema';
import { verifyApiKey } from '@/lib/api/auth';
import { checkRateLimit } from '@/lib/api/rateLimiting';
import { logRequest, detectPatterns } from '@/lib/api/audit';
import { addWatermark } from '@/lib/api/watermark';
import type { ViolationCategory, ViolationTag } from '@/db/schema';
import { VIOLATION_CATEGORIES, VIOLATION_TAGS } from '@/db/schema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> },
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  // identifier accepts either a stock ticker (e.g. "META") or an IEI (e.g. "IRIS-CORP-A1B2C3D4-001")
  const identifier = (await params).identifier.toUpperCase();
  let apiKey = '';

  try {
    const client = await verifyApiKey(request);
    apiKey = client.apiKey;

    const { allowed, remaining } = await checkRateLimit(client.apiKey, client.tier);
    if (!allowed) {
      await logRequest(client.apiKey, `/api/v1/companies/${identifier}`, identifier, null, ip, null, 429);
      return NextResponse.json(addWatermark({ error: 'Rate limit exceeded' }, client), { status: 429 });
    }

    const coRows = await db
      .select()
      .from(companies)
      .where(or(eq(companies.ticker, identifier), eq(companies.iei, identifier)))
      .limit(1);

    if (coRows.length === 0) {
      await logRequest(client.apiKey, `/api/v1/companies/${identifier}`, identifier, null, ip, null, 404);
      return NextResponse.json(addWatermark({ error: 'Company not found' }, client), { status: 404 });
    }

    const company = coRows[0];

    const blockRows = await db
      .select({
        category: blocks.category,
        violationTag: blocks.violationTag,
        amount: blocks.amount,
        violationDate: blocks.violationDate,
        blockId: blocks.blockId,
        createdAt: blocks.createdAt,
      })
      .from(blocks)
      .where(eq(blocks.companyId, company.id));

    // Aggregates
    const byCategory = Object.fromEntries(
      VIOLATION_CATEGORIES.map((c) => [c, 0]),
    ) as Record<ViolationCategory, number>;

    const bySeverity = Object.fromEntries(
      VIOLATION_TAGS.map((t) => [t, 0]),
    ) as Record<ViolationTag, number>;

    let totalFines = 0;
    let mostRecentViolation: string | null = null;

    for (const b of blockRows) {
      byCategory[b.category] = (byCategory[b.category] ?? 0) + 1;
      bySeverity[b.violationTag] = (bySeverity[b.violationTag] ?? 0) + 1;
      totalFines += b.amount ?? 0;
      if (b.violationDate && (!mostRecentViolation || b.violationDate > mostRecentViolation)) {
        mostRecentViolation = b.violationDate;
      }
    }

    const profile = {
      iei: company.iei,
      name: company.name,
      ticker: company.ticker,
      slug: company.slug,
      website: company.website,
      description: company.description,
      violationCount: blockRows.length,
      violationCountByCategory: byCategory,
      totalFines,
      mostRecentViolation,
      severityBreakdown: bySeverity,
    };

    await logRequest(client.apiKey, `/api/v1/companies/${identifier}`, identifier, null, ip, null, 200);
    await detectPatterns(client.apiKey, identifier);

    return NextResponse.json(
      addWatermark(profile, client),
      { headers: { 'X-RateLimit-Remaining': String(remaining) } },
    );
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Internal error';
    if (apiKey) await logRequest(apiKey, `/api/v1/companies/${identifier}`, identifier, null, ip, null, status).catch(() => {});
    return NextResponse.json({ error: message }, { status });
  }
}
