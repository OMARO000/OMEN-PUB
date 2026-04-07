import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies, stagedBlocks } from '@/db/schema';
import type { RawBlock, StagedBlockInput } from './types';

// ---------------------------------------------------------------------------
// Company upsert
// ---------------------------------------------------------------------------

export function ensureCompany(ticker: string, name: string): number {
  const slug = ticker.toLowerCase();

  const existing = db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.slug, slug))
    .limit(1)
    .all();

  if (existing.length > 0) return existing[0].id;

  const inserted = db
    .insert(companies)
    .values({ name, slug, ticker: slug.toUpperCase() })
    .returning({ id: companies.id })
    .get();

  if (!inserted) {
    throw new Error(`Failed to insert company: ${name} (${ticker})`);
  }

  return inserted.id;
}

// ---------------------------------------------------------------------------
// Block staging
// ---------------------------------------------------------------------------

export function stageBlock(block: RawBlock, companyId: number): number {
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

  const inserted = db
    .insert(stagedBlocks)
    .values(input as any)
    .returning({ id: stagedBlocks.id })
    .get();

  if (!inserted) {
    throw new Error(`Failed to stage block: ${block.blockId}`);
  }

  return inserted.id;
}

export function stageBlocks(blocks: RawBlock[], companyId: number): number[] {
  return blocks.map(block => stageBlock(block, companyId));
}
