import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { apiClients } from '@/db/schema';
import { API_TIERS } from '@/db/schema';
import type { ApiTier } from '@/db/schema';

const ADMIN_COOKIE = 'omen_admin_token';

function isAdminAuthed(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET;
  return !!(secret && token === secret);
}

// GET — list all API clients
export async function GET(request: NextRequest) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clients = await db
    .select({
      id: apiClients.id,
      clientName: apiClients.clientName,
      email: apiClients.email,
      useCase: apiClients.useCase,
      tier: apiClients.tier,
      isActive: apiClients.isActive,
      createdAt: apiClients.createdAt,
      // Never return apiKey in list view
    })
    .from(apiClients);

  return NextResponse.json({ clients });
}

// POST — create new API client
export async function POST(request: NextRequest) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { clientName, email, useCase, tier } = body;

  if (!clientName || !email || !useCase) {
    return NextResponse.json({ error: 'clientName, email, and useCase are required' }, { status: 400 });
  }

  if (tier && !(API_TIERS as readonly string[]).includes(tier)) {
    return NextResponse.json({ error: `Invalid tier. Must be one of: ${API_TIERS.join(', ')}` }, { status: 400 });
  }

  // Generate random 32-char hex API key — shown once, never retrievable
  const apiKey = randomBytes(16).toString('hex');

  await db.insert(apiClients).values({
    apiKey,
    clientName,
    email,
    useCase,
    tier: (tier as ApiTier) ?? 'STARTER',
    isActive: true,
  });

  return NextResponse.json({ apiKey }, { status: 201 });
}
