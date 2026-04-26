import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { researchCompany } from '../lib/agent/researchAgent';
import { companies, stagedBlocks } from '../db/schema';
import { pinBlock } from '../lib/ipfs';
import type { Company, RawBlock, AgentRunConfig } from '../lib/agent/types';
import { DEFAULT_AGENT_CONFIG } from '../lib/agent/types';

// ---------------------------------------------------------------------------
// DB — own connection for this long-running script
// ---------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

// prepare: false required for Supabase PgBouncer transaction mode
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

// ---------------------------------------------------------------------------
// Companies loader
// ---------------------------------------------------------------------------

function loadCompanies(): Company[] {
  const filePath = path.resolve(process.cwd(), '../omen-private/companies.txt');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const result: Company[] = [];
  let index = 1;

  raw.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('|').map(p => p.trim());
    if (parts.length < 3) return;
    const [ticker, name, tierStr] = parts;
    const tier = parseInt(tierStr, 10);
    if (!ticker || !name || isNaN(tier)) return;
    result.push({ index: index++, ticker, name, tier });
  });

  return result;
}

// ---------------------------------------------------------------------------
// Ensure company row exists, return its id
// ---------------------------------------------------------------------------

async function upsertCompany(company: Company): Promise<number> {
  const slug = company.ticker.toLowerCase().replace(/[^a-z0-9]/g, '-');

  const existing = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.ticker, company.ticker))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const inserted = await db
    .insert(companies)
    .values({
      name: company.name,
      slug,
      ticker: company.ticker,
      tier: company.tier,
    })
    .returning({ id: companies.id });

  return inserted[0].id;
}

// ---------------------------------------------------------------------------
// Stage blocks — pin AUTO_APPROVED immediately, hold the rest
// ---------------------------------------------------------------------------

async function stageBlocks(
  companyId: number,
  blocks: RawBlock[],
  dryRun: boolean
): Promise<{ staged: number; pinned: number }> {
  if (blocks.length === 0) return { staged: 0, pinned: 0 };

  let staged = 0;
  let pinned = 0;

  for (const block of blocks) {
    // Skip duplicates
    const existing = await db
      .select({ id: stagedBlocks.id })
      .from(stagedBlocks)
      .where(eq(stagedBlocks.blockId, block.blockId))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  [SKIP] ${block.blockId} already staged`);
      continue;
    }

    // Pin AUTO_APPROVED blocks immediately; others wait for review
    let ipfsCid: string | null = null;
    if (!dryRun && block.confidenceRouting === 'AUTO_APPROVED') {
      try {
        const result = await pinBlock(block);
        ipfsCid = result.cid;
        pinned++;
        console.log(`  [IPFS] ${block.blockId} → ${result.cid}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  [IPFS ERROR] ${block.blockId}: ${msg}`);
        // Continue — stage even if pin fails
      }
    }

    await db.insert(stagedBlocks).values({
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
      promptVersion: block.promptVersion ?? 'OMEN_AGENT_v3.0',
      resolutionStatus: 'active' as const,
      violationDate: block.date,
      researchedAt: block.researchedAt,
      // AUTO_APPROVED blocks get pinned and pre-approved
      reviewStatus: block.confidenceRouting === 'AUTO_APPROVED' ? 'approved' : 'pending',
    });

    staged++;
    console.log(`  [${block.confidenceRouting}] ${block.blockId} staged${ipfsCid ? ' + pinned' : ''}`);
  }

  return { staged, pinned };
}

// ---------------------------------------------------------------------------
// Delay helpers
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

async function run(config: AgentRunConfig = DEFAULT_AGENT_CONFIG) {
  const allCompanies = loadCompanies();
  const start = config.startFromIndex ?? 0;
  const list = config.maxCompanies
    ? allCompanies.slice(start, start + config.maxCompanies)
    : allCompanies.slice(start);

  console.log(`\nOMEN Research Runner`);
  console.log(`Companies: ${list.length} | Batch: ${config.batchSize} | Dry run: ${config.dryRun ?? false}\n`);

  let totalStaged = 0;
  let totalPinned = 0;
  let totalErrors = 0;

  for (let i = 0; i < list.length; i++) {
    const company = list[i];
    const isLastInBatch = (i + 1) % config.batchSize === 0;
    const isLast = i === list.length - 1;

    console.log(`[${i + 1}/${list.length}] ${company.ticker} — ${company.name}`);

    try {
      if (config.dryRun) {
        console.log(`  [DRY RUN] skipping API call`);
        continue;
      }

      const companyId = await upsertCompany(company);
      const blocks = await researchCompany(company);

      console.log(`  → ${blocks.length} block(s) found`);

      const { staged, pinned } = await stageBlocks(companyId, blocks, false);
      console.log(`  → ${staged} staged, ${pinned} pinned to IPFS`);
      totalStaged += staged;
      totalPinned += pinned;

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [ERROR] ${company.ticker}: ${msg}`);
      totalErrors++;
    }

    if (!isLast) {
      if (isLastInBatch) {
        console.log(`\n  [COOLDOWN] ${config.batchCooldownMs / 1000}s batch cooldown...\n`);
        await delay(config.batchCooldownMs);
      } else {
        await delay(config.delayBetweenRequestsMs);
      }
    }
  }

  console.log(`\nDone. ${totalStaged} blocks staged. ${totalPinned} pinned to IPFS. ${totalErrors} errors.`);
  await client.end();
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const maxArg = args.find(a => a.startsWith('--max='));
const startArg = args.find(a => a.startsWith('--start='));

run({
  ...DEFAULT_AGENT_CONFIG,
  dryRun,
  maxCompanies: maxArg ? parseInt(maxArg.split('=')[1], 10) : undefined,
  startFromIndex: startArg ? parseInt(startArg.split('=')[1], 10) : undefined,
}).catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
