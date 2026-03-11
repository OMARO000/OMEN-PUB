import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, blocks, companies } from '@/db/schema';
import type { ViolationTag, ViolationCategory } from '@/db/schema';

export interface CompanyExposure {
  name: string;
  ticker: string;
  violationCount: number;
  totalFines: number;
}

export interface ExposureResult {
  totalViolations: number;
  totalFines: number;
  byCategory: Record<ViolationCategory, number>;
  bySeverity: Record<ViolationTag, number>;
  companies: CompanyExposure[];
  trackedTickers: string[];
}

const EMPTY_BY_CATEGORY: Record<ViolationCategory, number> = {
  PRI: 0, LAB: 0, ETH: 0, ENV: 0, ANT: 0,
};

const EMPTY_BY_SEVERITY: Record<ViolationTag, number> = {
  GOOD: 0, BAD: 0, UGLY: 0, BROKEN_PROMISE: 0, QUESTIONABLE: 0,
};

export async function calculateExposure(accountNumber: string): Promise<ExposureResult> {
  // Load user and their tracked tickers
  const userRows = await db
    .select({ companiesTracked: users.companiesTracked })
    .from(users)
    .where(eq(users.accountNumber, accountNumber))
    .limit(1);

  if (userRows.length === 0) {
    return {
      totalViolations: 0,
      totalFines: 0,
      byCategory: { ...EMPTY_BY_CATEGORY },
      bySeverity: { ...EMPTY_BY_SEVERITY },
      companies: [],
      trackedTickers: [],
    };
  }

  let trackedTickers: string[] = [];
  try {
    trackedTickers = JSON.parse(userRows[0].companiesTracked ?? '[]');
  } catch {
    trackedTickers = [];
  }

  if (trackedTickers.length === 0) {
    return {
      totalViolations: 0,
      totalFines: 0,
      byCategory: { ...EMPTY_BY_CATEGORY },
      bySeverity: { ...EMPTY_BY_SEVERITY },
      companies: [],
      trackedTickers: [],
    };
  }

  // Resolve tickers → company rows
  const companyRows = await db
    .select({ id: companies.id, name: companies.name, ticker: companies.ticker })
    .from(companies)
    .where(inArray(companies.ticker, trackedTickers));

  if (companyRows.length === 0) {
    return {
      totalViolations: 0,
      totalFines: 0,
      byCategory: { ...EMPTY_BY_CATEGORY },
      bySeverity: { ...EMPTY_BY_SEVERITY },
      companies: [],
      trackedTickers,
    };
  }

  const companyIds = companyRows.map((c) => c.id);

  // Fetch all blocks for those companies
  const blockRows = await db
    .select({
      companyId: blocks.companyId,
      category: blocks.category,
      violationTag: blocks.violationTag,
      amount: blocks.amount,
    })
    .from(blocks)
    .where(inArray(blocks.companyId, companyIds));

  // Aggregate
  const byCategory = { ...EMPTY_BY_CATEGORY };
  const bySeverity = { ...EMPTY_BY_SEVERITY };
  let totalFines = 0;

  // Per-company accumulators
  const companyMap = new Map<number, { name: string; ticker: string; violationCount: number; totalFines: number }>();
  for (const c of companyRows) {
    companyMap.set(c.id, { name: c.name, ticker: c.ticker, violationCount: 0, totalFines: 0 });
  }

  for (const b of blockRows) {
    byCategory[b.category] = (byCategory[b.category] ?? 0) + 1;
    bySeverity[b.violationTag] = (bySeverity[b.violationTag] ?? 0) + 1;
    const fine = b.amount ?? 0;
    totalFines += fine;

    const co = companyMap.get(b.companyId);
    if (co) {
      co.violationCount += 1;
      co.totalFines += fine;
    }
  }

  const companiesSorted = Array.from(companyMap.values()).sort(
    (a, b) => b.violationCount - a.violationCount,
  );

  return {
    totalViolations: blockRows.length,
    totalFines,
    byCategory,
    bySeverity,
    companies: companiesSorted,
    trackedTickers,
  };
}
