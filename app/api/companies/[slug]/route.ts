import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies } from '@/db/schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const company = await db.query.companies.findFirst({
      where: eq(companies.slug, slug),
      with: {
        blocks: {
          orderBy: (v, { desc }) => [desc(v.createdAt)],
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (err) {
    console.error(`[GET /api/companies/${slug}]`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
