import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { blocks, companies } from '@/db/schema';
import { verifyApiKey } from '@/lib/api/auth';
import { checkRateLimit } from '@/lib/api/rateLimiting';
import { logRequest } from '@/lib/api/audit';
import { addWatermark } from '@/lib/api/watermark';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  let apiKey = '';

  try {
    const client = await verifyApiKey(request);
    apiKey = client.apiKey;

    const { allowed, remaining } = await checkRateLimit(client.apiKey, client.tier);
    if (!allowed) {
      await logRequest(client.apiKey, `/api/v1/violations/${(await params).id}`, null, null, ip, null, 429);
      return NextResponse.json(addWatermark({ error: 'Rate limit exceeded' }, client), { status: 429 });
    }

    const rows = await db
      .select()
      .from(blocks)
      .where(eq(blocks.blockId, (await params).id))
      .limit(1);

    if (rows.length === 0) {
      await logRequest(client.apiKey, `/api/v1/violations/${(await params).id}`, null, null, ip, null, 404);
      return NextResponse.json(addWatermark({ error: 'Block not found' }, client), { status: 404 });
    }

    // Resolve company name
    const coRows = await db
      .select({ name: companies.name, ticker: companies.ticker })
      .from(companies)
      .where(eq(companies.id, rows[0].companyId))
      .limit(1);

    const block = {
      ...rows[0],
      company: coRows[0] ?? null,
    };

    await logRequest(client.apiKey, `/api/v1/violations/${(await params).id}`, coRows[0]?.ticker ?? null, null, ip, null, 200);

    return NextResponse.json(
      addWatermark(block, client),
      { headers: { 'X-RateLimit-Remaining': String(remaining) } },
    );
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Internal error';
    if (apiKey) await logRequest(apiKey, `/api/v1/violations/${(await params).id}`, null, null, ip, null, status).catch(() => {});
    return NextResponse.json({ error: message }, { status });
  }
}
