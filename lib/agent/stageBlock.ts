import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies, stagedBlocks } from '@/db/schema';
import type { RawBlock } from './types';

const CURRENT_PROMPT_VERSION = 'OMEN_AGENT_v3.0';

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

export async function stageBlock(
  block: RawBlock,
  companyId: number,
  promptVersion: string = CURRENT_PROMPT_VERSION,
): Promise<number> {
  const inserted = await db
    .insert(stagedBlocks)
    .values({
      blockId: block.blockId,
      companyId,
      category: block.category,
      violationTag: block.violationTag,
      title: block.formalSummary.slice(0, 120),
      formalSummary: block.formalSummary,
      regulatoryBasis: block.regulatoryBasis,
      enforcementDetails: block.enforcementDetails,
      jurisdiction: block.jurisdiction,
      conversationalWhatHappened: block.conversationalWhatHappened,
      conversationalWhyItMatters: block.conversationalWhyItMatters,
      conversationalCompanyResponse: block.conversationalCompanyResponse,
      amount: block.amount,
      amountCurrency: block.amountCurrency,
      affectedIndividuals: block.affectedIndividuals,
      sourcesJson: JSON.stringify(block.sources),
      sourceDisclaimersJson: JSON.stringify(block.sourceDisclaimers),
      primarySourceUrl: block.sources?.[0]?.url ?? null,
      verificationJson: JSON.stringify(block.verification),
      confidenceScore: block.confidenceScore,
      confidenceRouting: block.confidenceRouting,
      brokenPromiseJson: block.brokenPromiseCheck
        ? JSON.stringify(block.brokenPromiseCheck)
        : null,
      supersedesBlockId: block.supersedesBlockId ?? null,
      promptVersion,
      resolutionStatus: 'active',
      violationDate: block.date,
      researchedAt: block.researchedAt,
      reviewStatus: block.confidenceRouting === 'AUTO_APPROVED' ? 'approved' : 'pending',
    })
    .returning({ id: stagedBlocks.id });

  if (!inserted[0]) {
    throw new Error(`Failed to stage block: ${block.blockId}`);
  }

  return inserted[0].id;
}

export async function stageBlocks(
  blocks: RawBlock[],
  companyId: number,
  promptVersion: string = CURRENT_PROMPT_VERSION,
): Promise<number[]> {
  const results: number[] = [];
  for (const block of blocks) {
    results.push(await stageBlock(block, companyId, promptVersion));
  }
  return results;
}
