import { NextRequest, NextResponse } from 'next/server';
import { eq, and, ilike, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { blocks, companies } from '@/db/schema';
import { verifyApiKey } from '@/lib/api/auth';
import { checkRateLimit } from '@/lib/api/rateLimiting';
import { logRequest, detectPatterns, checkTechnicality } from '@/lib/api/audit';
import { addWatermark } from '@/lib/api/watermark';
import type { ViolationCategory, ViolationTag } from '@/db/schema';

// Safeguard: blocked use cases
const BLOCKED_USE_CASES = ['representing-defendant', 'reputation-management'];

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  let apiKey = '';

  try {
    const client = await verifyApiKey(request);
    apiKey = client.apiKey;

    // Safeguard: rate limit
    const { allowed, remaining } = await checkRateLimit(client.apiKey, client.tier);
    if (!allowed) {
      await logRequest(client.apiKey, '/api/v1/violations/search', null, null, ip, null, 429);
      return NextResponse.json(
        addWatermark({ error: 'Rate limit exceeded' }, client),
        { status: 429, headers: { 'X-RateLimit-Remaining': '0' } },
      );
    }

    const { searchParams } = request.nextUrl;
    const q = searchParams.get('q') ?? null;
    const company = searchParams.get('company') ?? null;
    const category = searchParams.get('category') as ViolationCategory | null;
    const severity = searchParams.get('severity') as ViolationTag | null;
    const useCase = searchParams.get('use_case') ?? null;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

    // Safeguard: use case declaration required
    if (!useCase) {
      await logRequest(client.apiKey, '/api/v1/violations/search', company, q, ip, null, 400);
      return NextResponse.json(
        addWatermark({ error: 'use_case parameter required' }, client),
        { status: 400 },
      );
    }

    // Safeguard: auto-reject blocked use cases
    if (BLOCKED_USE_CASES.includes(useCase)) {
      await logRequest(client.apiKey, '/api/v1/violations/search', company, q, ip, useCase, 403);
      return NextResponse.json(
        addWatermark({ error: 'Use case not permitted' }, client),
        { status: 403 },
      );
    }

    // Safeguard: technicality keyword detection
    const technicality = checkTechnicality(q);
    if (technicality) {
      console.warn(
        `[OMEN API TECHNICALITY] apiKey=${client.apiKey.slice(0, 8)}*** query="${q}"`,
      );
    }

    // Build query conditions
    const conditions = [];

    if (company) {
      const identifier = company.toUpperCase();
      const coRows = await db
        .select({ id: companies.id })
        .from(companies)
        .where(or(eq(companies.ticker, identifier), eq(companies.iei, identifier)))
        .limit(1);
      if (coRows.length > 0) {
        conditions.push(eq(blocks.companyId, coRows[0].id));
      }
    }

    if (category) conditions.push(eq(blocks.category, category));
    if (severity) conditions.push(eq(blocks.violationTag, severity));
    if (q) {
      conditions.push(
        or(
          ilike(blocks.title, `%${q}%`),
          ilike(blocks.formalSummary, `%${q}%`),
        )!,
      );
    }

    const allRows = await db
      .select({
        blockId: blocks.blockId,
        category: blocks.category,
        violationTag: blocks.violationTag,
        title: blocks.title,
        formalSummary: blocks.formalSummary,
        amount: blocks.amount,
        confidenceScore: blocks.confidenceScore,
        violationDate: blocks.violationDate,
        ipfsCid: blocks.ipfsCid,
        companyId: blocks.companyId,
      })
      .from(blocks)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = allRows.length;
    const offset = (page - 1) * limit;
    const pageRows = allRows.slice(offset, offset + limit);

    await logRequest(client.apiKey, '/api/v1/violations/search', company, q, ip, useCase, 200);
    if (company) await detectPatterns(client.apiKey, company);

    return NextResponse.json(
      addWatermark(
        {
          results: pageRows,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
          technicality_flag: technicality,
        },
        client,
      ),
      { headers: { 'X-RateLimit-Remaining': String(remaining) } },
    );
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Internal error';
    if (apiKey) await logRequest(apiKey, '/api/v1/violations/search', null, null, ip, null, status).catch(() => {});
    return NextResponse.json({ error: message }, { status });
  }
}
