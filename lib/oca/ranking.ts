import { like, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { blocks, companies } from '@/db/schema';

export interface RankableAlternative {
  id: number;
  name: string;
  category: string;
  websiteUrl: string | null;
  replaces: string | null;
  whyBetter: string | null;
  openSource: boolean;
  selfHostable: boolean;
  upvotes: number;
  downvotes: number;
  status: string;
  submittedBy: string | null;
  createdAt: Date | null;
}

export interface RankedAlternative extends RankableAlternative {
  score: number;
}

// Checks whether the alternative's name appears as a known company in the
// blocks table (rough heuristic — alternative name LIKE company name).
async function getViolationPenalties(
  alternatives: RankableAlternative[],
): Promise<Map<number, number>> {
  const penalties = new Map<number, number>();
  if (alternatives.length === 0) return penalties;

  // Build a list of unique names to check
  const names = [...new Set(alternatives.map((a) => a.name))];

  // One query: find companies whose name fuzzy-matches any alternative name
  const matchedCompanies = await db
    .selectDistinct({ name: companies.name, id: companies.id })
    .from(companies)
    .where(
      or(...names.map((n) => like(companies.name, `%${n}%`))),
    );

  if (matchedCompanies.length === 0) return penalties;

  // Check if those companies have blocks (violations)
  const companyIdsWithViolations = new Set<number>();
  for (const co of matchedCompanies) {
    const row = await db
      .select({ id: blocks.id })
      .from(blocks)
      .where(like(companies.name, `%${co.name}%`))
      .limit(1);
    if (row.length > 0) companyIdsWithViolations.add(co.id);
  }

  // Map back: if an alternative's name roughly matches a penalized company
  for (const alt of alternatives) {
    for (const co of matchedCompanies) {
      if (
        companyIdsWithViolations.has(co.id) &&
        (co.name.toLowerCase().includes(alt.name.toLowerCase()) ||
          alt.name.toLowerCase().includes(co.name.toLowerCase()))
      ) {
        penalties.set(alt.id, -20);
        break;
      }
    }
  }

  return penalties;
}

export async function rankAlternatives(
  alternatives: RankableAlternative[],
): Promise<RankedAlternative[]> {
  const penalties = await getViolationPenalties(alternatives);

  const ranked = alternatives.map((alt): RankedAlternative => {
    let score = (alt.upvotes ?? 0) - (alt.downvotes ?? 0);
    if (alt.openSource) score += 10;
    if (alt.selfHostable) score += 5;
    const penalty = penalties.get(alt.id) ?? 0;
    score += penalty;
    return { ...alt, score };
  });

  return ranked.sort((a, b) => b.score - a.score);
}
