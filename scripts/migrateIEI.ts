/**
 * One-time data migration: assign IEIs to all existing companies that don't
 * have one yet.
 *
 * Usage:
 *   npx tsx scripts/migrateIEI.ts [--dry-run]
 *
 * Reads DATABASE_URL from .env.local.
 * Safe to re-run — skips companies that already have an IEI.
 *
 * Jurisdiction assumption: all companies created before the IEI system
 * launched are US-domiciled CORP entities. Jurisdiction can be updated
 * manually via the admin panel for any exceptions.
 */

import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { isNull, asc, eq } from 'drizzle-orm';
import { companies } from '../db/schema';
import { computeHash8, generateIEI } from '../lib/iei';
import type { IEIType } from '../db/schema';

// ---------------------------------------------------------------------------
// DB
// ---------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

const DEFAULT_TYPE: IEIType = 'CORP';
const DEFAULT_JURISDICTION = 'US';
const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
  console.log(`\nOMEN IEI Migration${DRY_RUN ? ' [DRY RUN]' : ''}`);
  console.log(`Default type       : ${DEFAULT_TYPE}`);
  console.log(`Default jurisdiction: ${DEFAULT_JURISDICTION}`);
  console.log('---\n');

  // Fetch all companies without an IEI, ordered by id for deterministic output
  const rows = await db
    .select({ id: companies.id, name: companies.name, slug: companies.slug, ticker: companies.ticker })
    .from(companies)
    .where(isNull(companies.iei))
    .orderBy(asc(companies.id));

  if (rows.length === 0) {
    console.log('All companies already have IEIs. Nothing to do.');
    await client.end();
    return;
  }

  console.log(`Companies to migrate: ${rows.length}\n`);

  // Build collision-aware IEI assignments in a single pass.
  // We track SEQs locally during this run so we don't need a round-trip
  // per row while still correctly resolving collisions within the batch.
  const seqMap = new Map<string, number>(); // key: "TYPE-HASH8" → highest SEQ assigned so far

  // Seed seqMap from IEIs already in the DB (companies that already have one)
  const existing = await db
    .select({ iei: companies.iei })
    .from(companies);

  for (const row of existing) {
    if (!row.iei) continue;
    // Format: IRIS-TYPE-HASH8-SEQ
    const parts = row.iei.split('-');
    if (parts.length !== 4) continue;
    const [, type, hash8, seqStr] = parts;
    const seq = parseInt(seqStr, 10);
    const mapKey = `${type}-${hash8}`;
    if (!isNaN(seq) && (seqMap.get(mapKey) ?? 0) < seq) {
      seqMap.set(mapKey, seq);
    }
  }

  const assignments: Array<{ id: number; name: string; ticker: string | null; iei: string }> = [];

  for (const row of rows) {
    const hash8 = computeHash8(row.name, DEFAULT_JURISDICTION);
    const mapKey = `${DEFAULT_TYPE}-${hash8}`;
    const nextSeq = (seqMap.get(mapKey) ?? 0) + 1;
    seqMap.set(mapKey, nextSeq);
    const iei = generateIEI(row.name, DEFAULT_JURISDICTION, DEFAULT_TYPE, nextSeq);
    assignments.push({ id: row.id, name: row.name, ticker: row.ticker, iei });
  }

  // Print the mapping table
  console.log('ID   | Ticker | IEI                           | Name');
  console.log('-----|--------|-------------------------------|------------------------------');
  for (const a of assignments) {
    const id     = String(a.id).padEnd(4);
    const ticker = (a.ticker ?? '—').padEnd(6);
    const iei    = a.iei.padEnd(29);
    console.log(`${id} | ${ticker} | ${iei} | ${a.name}`);
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes written.');
    await client.end();
    return;
  }

  // Apply updates one at a time — small batch, correctness > speed
  let updated = 0;
  for (const a of assignments) {
    await db
      .update(companies)
      .set({ iei: a.iei })
      .where(eq(companies.id, a.id));
    updated++;
  }

  console.log(`\nDone. ${updated} IEIs assigned.`);
  await client.end();
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
