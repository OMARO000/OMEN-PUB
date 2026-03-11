import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contributions } from '@/db/schema';
import { contributionSubmitSchema } from '@/lib/validations';

function getSession(request: NextRequest): string | null {
  return request.cookies.get('omen_session')?.value ?? null;
}

export async function POST(request: NextRequest) {
  const accountNumber = getSession(request);
  if (!accountNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = contributionSubmitSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: result.error.issues },
      { status: 400 },
    );
  }

  const { type, title, description, fileUrl, companyTicker, blockId } = result.data;

  await db.insert(contributions).values({
    accountNumber,
    type,
    title,
    description,
    fileUrl: fileUrl || null,
    companyTicker: companyTicker || null,
    blockId: blockId || null,
    status: 'pending',
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
