/**
 * OMEN Research Agent — CLI entry point
 *
 * Usage:
 *   npx tsx scripts/runAgent.ts [options]
 *
 * Options:
 *   --dry-run          Parse and research but do not write to DB
 *   --max=N            Process only the first N companies
 *   --start=N          Skip the first N companies (0-indexed, for resuming)
 *
 * Required env vars (set in .env.local):
 *   ANTHROPIC_API_KEY
 *   AI_RESEARCH_PROMPT_PATH  (path to omen-private/AI_RESEARCH_PROMPT.md)
 *   DATABASE_URL             (optional — defaults to ./omen.db)
 */

// ---------------------------------------------------------------------------
// Load .env.local before any imports that read process.env
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

import { getCompaniesFromEnv } from '../lib/agent/parseCompanies';
import { researchCompany } from '../lib/agent/researchAgent';
import { ensureCompany, stageBlocks } from '../lib/agent/stageBlock';
import { DEFAULT_AGENT_CONFIG } from '../lib/agent/types';
import type { AgentRunConfig, BatchResult } from '../lib/agent/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseArgs(): Partial<AgentRunConfig> {
  const args = process.argv.slice(2);

  const dryRun = args.includes('--dry-run');

  const maxFlag = args.find(a => a.startsWith('--max='));
  const maxCompanies = maxFlag ? parseInt(maxFlag.split('=')[1], 10) : undefined;

  const startFlag = args.find(a => a.startsWith('--start='));
  const startFromIndex = startFlag ? parseInt(startFlag.split('=')[1], 10) : undefined;

  return { dryRun, maxCompanies, startFromIndex };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function runAgent(overrides: Partial<AgentRunConfig> = {}): Promise<void> {
  const cfg: AgentRunConfig = { ...DEFAULT_AGENT_CONFIG, ...overrides };

  const allCompanies = getCompaniesFromEnv();
  const start = cfg.startFromIndex ?? 0;
  const slice = allCompanies.slice(start);
  const targets = cfg.maxCompanies !== undefined ? slice.slice(0, cfg.maxCompanies) : slice;

  console.log('OMEN Research Agent v3');
  console.log(`Companies to research : ${targets.length}`);
  console.log(`Batch size            : ${cfg.batchSize}`);
  console.log(`Request delay         : ${cfg.delayBetweenRequestsMs}ms`);
  console.log(`Batch cooldown        : ${cfg.batchCooldownMs}ms`);
  console.log(`Dry run               : ${cfg.dryRun ?? false}`);
  if (start > 0) console.log(`Resuming from index   : ${start}`);
  console.log('---');

  const results: BatchResult[] = [];
  let batchNumber = 0;

  for (let i = 0; i < targets.length; i += cfg.batchSize) {
    const batch = targets.slice(i, i + cfg.batchSize);
    batchNumber++;

    console.log(`\nBatch ${batchNumber} — [${i + start + 1}–${i + start + batch.length}] of ${allCompanies.length}`);

    for (let j = 0; j < batch.length; j++) {
      const company = batch[j];
      const t0 = Date.now();

      const result: BatchResult = {
        company,
        blocksFound: 0,
        blocksStaged: 0,
        errors: [],
        durationMs: 0,
      };

      try {
        process.stdout.write(`  [${company.ticker}] ${company.name} ... `);

        const blocks = await researchCompany(company);
        result.blocksFound = blocks.length;

        if (!cfg.dryRun && blocks.length > 0) {
          const companyId = await ensureCompany(company.ticker, company.name);
          const ids = await stageBlocks(blocks, companyId);
          result.blocksStaged = ids.length;
          console.log(`${blocks.length} found, ${ids.length} staged`);
        } else {
          console.log(`${blocks.length} found${cfg.dryRun ? ' (dry run)' : ''}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(msg);
        console.log(`ERROR: ${msg}`);
        console.error(err);
      }

      result.durationMs = Date.now() - t0;
      results.push(result);

      // Rate limit delay between companies (skip after last in batch)
      if (j < batch.length - 1) {
        await sleep(cfg.delayBetweenRequestsMs);
      }
    }

    // Cooldown between batches (skip after last batch)
    if (i + cfg.batchSize < targets.length) {
      console.log(`\n  Cooling down ${cfg.batchCooldownMs / 1000}s before next batch...`);
      await sleep(cfg.batchCooldownMs);
    }
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  const totalFound  = results.reduce((s, r) => s + r.blocksFound, 0);
  const totalStaged = results.reduce((s, r) => s + r.blocksStaged, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);
  const withErrors  = results.filter(r => r.errors.length > 0);

  console.log('\n--- SUMMARY ---');
  console.log(`Companies processed : ${results.length}`);
  console.log(`Blocks found        : ${totalFound}`);
  console.log(`Blocks staged       : ${totalStaged}`);
  console.log(`Errors              : ${totalErrors}`);

  if (withErrors.length > 0) {
    console.log('\nFailed companies:');
    for (const r of withErrors) {
      console.log(`  [${r.company.ticker}] ${r.errors.join('; ')}`);
    }
  }
}

runAgent(parseArgs()).catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
