import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { apiClients } from '@/db/schema';
import type { ApiTier } from '@/db/schema';

export interface ApiClient {
  id: number;
  apiKey: string;
  clientName: string;
  email: string;
  useCase: string;
  tier: ApiTier;
  isActive: boolean;
}

// Safeguard 1: API key authentication
export async function verifyApiKey(request: Request): Promise<ApiClient> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Missing or malformed Authorization header') as Error & { status: number };
    err.status = 401;
    throw err;
  }

  const apiKey = authHeader.slice(7).trim();

  if (!apiKey) {
    const err = new Error('No API key provided') as Error & { status: number };
    err.status = 401;
    throw err;
  }

  const rows = await db
    .select()
    .from(apiClients)
    .where(eq(apiClients.apiKey, apiKey))
    .limit(1);

  if (rows.length === 0) {
    const err = new Error('Invalid API key') as Error & { status: number };
    err.status = 401;
    throw err;
  }

  const client = rows[0];

  // Safeguard 2: Suspension check
  if (!client.isActive) {
    const err = new Error('API key suspended. Contact support.') as Error & { status: number };
    err.status = 403;
    throw err;
  }

  return client as ApiClient;
}

// Tier access guard — throws 403 if client tier is insufficient
export function requireTier(client: ApiClient, allowed: ApiTier[]) {
  if (!allowed.includes(client.tier)) {
    const err = new Error(`Endpoint requires one of: ${allowed.join(', ')}. Your tier: ${client.tier}`) as Error & { status: number };
    err.status = 403;
    throw err;
  }
}
