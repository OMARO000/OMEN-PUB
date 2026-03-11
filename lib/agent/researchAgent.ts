import Anthropic from '@anthropic-ai/sdk';
import { loadPrompt } from './parseCompanies';
import type { Company, RawBlock } from './types';

// Lazy client — initialized on first use, reads env var at call time
let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set in .env.local');
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Prompt helpers
// ---------------------------------------------------------------------------

function getSystemPrompt(): string {
  return loadPrompt();
}

function buildUserMessage(company: Company): string {
  return [
    `Research company: ${company.name} (ticker: ${company.ticker}, tier: ${company.tier})`,
    '',
    'Research ALL 5 categories: PRI, LAB, ANT, ETH, ENV.',
    'Return ONLY a valid JSON array of violation blocks. No prose. No markdown code fences.',
    'Each block must conform exactly to the JSON OUTPUT SCHEMA in the system prompt.',
    'Return a maximum of 5 blocks total across all categories — prioritize the most significant violations.',
    'If no violations found for a category, omit it — do not fabricate.',
    'If no violations found in any category, return an empty array: []',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

function extractJson(text: string): string {
  // Strip markdown code fences if the model wrapped the output
  const stripped = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();

  if (stripped.startsWith('[') || stripped.startsWith('{')) return stripped;

  // Fallback: find first JSON array in the response
  const match = stripped.match(/\[[\s\S]*\]/);
  return match ? match[0] : '[]';
}

function parseBlocksFromResponse(text: string, ticker: string): RawBlock[] {
  const json = extractJson(text);

  if (!json || json === '[]') return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    console.error(`[${ticker}] JSON parse failed:`, (err as Error).message);
    console.error(`[${ticker}] Raw response (first 500 chars):`, text.slice(0, 500));
    return [];
  }

  if (!Array.isArray(parsed)) {
    // Model may have returned a single object instead of an array
    if (parsed !== null && typeof parsed === 'object') {
      return [parsed as RawBlock];
    }
    console.error(`[${ticker}] Response was not an array or object`);
    return [];
  }

  return parsed as RawBlock[];
}

// ---------------------------------------------------------------------------
// Main research function
// ---------------------------------------------------------------------------

export async function researchCompany(company: Company): Promise<RawBlock[]> {
  const stream = getClient().messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 32000,
    system: getSystemPrompt(),
    messages: [
      { role: 'user', content: buildUserMessage(company) },
    ],
  });

  const response = await stream.finalMessage();

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('');

  const blocks = parseBlocksFromResponse(text, company.ticker);

  return blocks;
}
