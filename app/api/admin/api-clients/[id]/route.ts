import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { apiClients, API_TIERS } from '@/db/schema';
import type { ApiTier } from '@/db/schema';

const ADMIN_COOKIE = 'omen_admin_token';

function isAdminAuthed(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET;
  return !!(secret && token === secret);
}

// PATCH — update tier or suspend/reinstate client
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const existing = await db
    .select({ id: apiClients.id })
    .from(apiClients)
    .where(eq(apiClients.id, id))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const body = await request.json();
  const updates: Partial<{ tier: ApiTier; isActive: boolean }> = {};

  if ('tier' in body) {
    if (!(API_TIERS as readonly string[]).includes(body.tier)) {
      return NextResponse.json({ error: `Invalid tier` }, { status: 400 });
    }
    updates.tier = body.tier as ApiTier;
  }

  if ('isActive' in body) {
    updates.isActive = Boolean(body.isActive);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  await db.update(apiClients).set(updates).where(eq(apiClients.id, id));

  return NextResponse.json({ success: true });
}
