import { createHash } from 'crypto';
import { like } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies } from '@/db/schema';
import type { IEIType } from '@/db/schema';

export type { IEIType };

// ---------------------------------------------------------------------------
// Hash
// ---------------------------------------------------------------------------

// SHA-256 of canonical name + jurisdiction, first 8 chars uppercase.
// Deterministic and reproducible: same inputs always produce the same HASH8.
export function computeHash8(name: string, jurisdiction: string): string {
  return createHash('sha256')
    .update(name + jurisdiction)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// IEI generation — pure, no DB access
// ---------------------------------------------------------------------------

export function generateIEI(
  name: string,
  jurisdiction: string,
  type: IEIType,
  seq: number = 1,
): string {
  const hash8 = computeHash8(name, jurisdiction);
  const seqStr = String(seq).padStart(3, '0');
  return `IRIS-${type}-${hash8}-${seqStr}`;
}

// ---------------------------------------------------------------------------
// Collision resolution — checks DB for existing IEIs with the same HASH8
// and returns a new IEI with the next available SEQ.
// ---------------------------------------------------------------------------

export async function resolveCollision(
  name: string,
  jurisdiction: string,
  type: IEIType,
): Promise<string> {
  const hash8 = computeHash8(name, jurisdiction);
  const prefix = `IRIS-${type}-${hash8}-`;

  const existing = await db
    .select({ iei: companies.iei })
    .from(companies)
    .where(like(companies.iei, `${prefix}%`));

  if (existing.length === 0) {
    return generateIEI(name, jurisdiction, type, 1);
  }

  // Parse the SEQ suffix from each existing IEI and find the max
  let maxSeq = 0;
  for (const row of existing) {
    if (!row.iei) continue;
    const suffix = row.iei.slice(prefix.length);
    const seq = parseInt(suffix, 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }

  return generateIEI(name, jurisdiction, type, maxSeq + 1);
}
