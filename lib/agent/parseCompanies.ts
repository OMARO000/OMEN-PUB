import fs from 'fs';
import path from 'path';
import type { Company } from './types';

// ---------------------------------------------------------------------------
// Regex patterns
// ---------------------------------------------------------------------------

// Matches tier section headers: ### TIER 1: ... or #### TIER 2: ...
const TIER_RE = /^#{1,4}\s+TIER\s+(\d+):/i;

// Matches company table rows: | 1 | Company Name | TICKER |
// First column must be a number (excludes dedup/config tables).
// Ticker must be uppercase letters/numbers only (excludes "Ticker", "---", etc.)
const ROW_RE = /^\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*([A-Z][A-Z0-9]{0,9})\s*\|/;

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export function parseCompanies(prompt: string): Company[] {
  const companies: Company[] = [];
  let currentTier = 0;

  for (const line of prompt.split('\n')) {
    const tierMatch = line.match(TIER_RE);
    if (tierMatch) {
      currentTier = parseInt(tierMatch[1], 10);
      continue;
    }

    const rowMatch = line.match(ROW_RE);
    if (!rowMatch) continue;

    const index = parseInt(rowMatch[1], 10);
    const name = rowMatch[2].trim();
    const ticker = rowMatch[3].trim();

    companies.push({ index, name, ticker, tier: currentTier });
  }

  return companies;
}

// ---------------------------------------------------------------------------
// Env loader
// ---------------------------------------------------------------------------

export function loadPrompt(): string {
  // Prefer file path reference (avoids multi-line escaping in .env.local)
  const promptPath = process.env.AI_RESEARCH_PROMPT_PATH;
  if (promptPath) {
    const resolved = path.resolve(process.cwd(), promptPath);
    return fs.readFileSync(resolved, 'utf-8');
  }

  // Fallback: inline env var
  const inline = process.env.AI_RESEARCH_PROMPT;
  if (inline) return inline;

  throw new Error(
    'Neither AI_RESEARCH_PROMPT_PATH nor AI_RESEARCH_PROMPT is set in .env.local.'
  );
}

export function getCompaniesFromEnv(): Company[] {
  const prompt = loadPrompt();
  const companies = parseCompanies(prompt);
  if (companies.length === 0) {
    throw new Error(
      'parseCompanies returned 0 companies. ' +
      'Verify AI_RESEARCH_PROMPT_PATH points to the full company list.'
    );
  }
  return companies;
}
