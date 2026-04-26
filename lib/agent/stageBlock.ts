import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies, stagedBlocks } from '@/db/schema';
import type { RawBlock, StagedBlockInput } from './types';

// ---------------------------------------------------------------------------
// Company upsert
// ---------------------------------------------------------------------------

export async function ensureCompany(ticker: string, name: string): Promise<number> {
  const slug = ticker.toLowerCase();

  const existing = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.slug, slug))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const inserted = await db
    .insert(companies)
    .values({ name, slug, ticker: slug.toUpperCase() })
    .returning({ id: companies.id });

  if (!inserted[0]) {
    throw new Error(`Failed to insert company: ${name} (${ticker})`);
  }

  return inserted[0].id;
}

// ---------------------------------------------------------------------------
// Block staging
// ---------------------------------------------------------------------------

export async function stageBlock(block: RawBlock, companyId: number): Promise<number> {
  // The AI returns snake_case fields; fall back to snake_case if camelCase is absent
  const b = block as unknown as Record<string, unknown>;
  const ticker      = (block.companyTicker ?? b['company_ticker'] ?? '') as string;
  const category    = (block.category     ?? b['category']        ?? '') as string;
  const tag         = (block.violationTag ?? b['violation_tag']   ?? '') as string;
  const sources     = (block.sources      ?? b['sources']         ?? []) as { url?: string }[];

  const input: StagedBlockInput = {
    companyId,
    title: `${ticker} ${category} — ${tag}`,
    content: JSON.stringify(block),
    violationTag: tag as RawBlock['violationTag'],
    sourceUrl: sources[0]?.url ?? null,
  };

  const inserted = await db
    .insert(stagedBlocks)
    .values(input as any)
    .returning({ id: stagedBlocks.id });

  if (!inserted[0]) {
    throw new Error(`Failed to stage block: ${block.blockId}`);
  }

  return inserted[0].id;
}

export async function stageBlocks(blocks: RawBlock[], companyId: number): Promise<number[]> {
  const results: number[] = [];
  for (const block of blocks) {
    results.push(await stageBlock(block, companyId));
  }
  return results;
}
