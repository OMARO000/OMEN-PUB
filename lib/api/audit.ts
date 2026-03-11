import { eq, and, gte, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { apiAuditLogs } from '@/db/schema';

// Safeguard 4: Full audit logging + pattern detection

export async function logRequest(
  apiKey: string,
  endpoint: string,
  company: string | null,
  query: string | null,
  ipAddress: string | null,
  useCase: string | null,
  statusCode: number,
): Promise<void> {
  await db.insert(apiAuditLogs).values({
    apiKey,
    endpoint,
    company: company ?? null,
    query: query ?? null,
    ipAddress: ipAddress ?? null,
    useCase: useCase ?? null,
    statusCode,
  });
}

// Safeguard 5: Pattern detection — flag excessive queries on a single company
export async function detectPatterns(apiKey: string, company: string | null): Promise<void> {
  if (!company) return;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({ total: count() })
    .from(apiAuditLogs)
    .where(
      and(
        eq(apiAuditLogs.apiKey, apiKey),
        eq(apiAuditLogs.company, company),
        gte(apiAuditLogs.createdAt, thirtyDaysAgo),
      ),
    );

  const total = rows[0]?.total ?? 0;

  if (total > 50) {
    console.warn(
      `[OMEN API PATTERN FLAG] apiKey=${apiKey.slice(0, 8)}*** company=${company} queries_30d=${total}`,
    );

    // Insert a sentinel flag record
    await db.insert(apiAuditLogs).values({
      apiKey,
      endpoint: '/__pattern_flag__',
      company,
      query: `pattern_detected:${total}_queries_30d`,
      ipAddress: null,
      useCase: 'SYSTEM_FLAG',
      statusCode: 0,
    });
  }
}

// Safeguard 6: Technicality keyword detection
const TECHNICALITY_KEYWORDS = [
  'procedural',
  'jurisdiction',
  'statute of limitations',
  'appeal',
  'dismissal',
];

export function checkTechnicality(query: string | null): boolean {
  if (!query) return false;
  const lower = query.toLowerCase();
  return TECHNICALITY_KEYWORDS.some((kw) => lower.includes(kw));
}
