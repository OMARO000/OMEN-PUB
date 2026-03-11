import { NextRequest, NextResponse } from 'next/server';
import { calculateExposure } from '@/lib/dashboard/calculateExposure';

export async function GET(request: NextRequest) {
  const accountNumber = request.cookies.get('omen_session')?.value;

  if (!accountNumber) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const exposure = await calculateExposure(accountNumber);
  return NextResponse.json(exposure);
}
