import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET() {
  const bank = process.env.NEXT_PUBLIC_BANK_NAME || 'MBBank';
  const acc = process.env.NEXT_PUBLIC_BANK_ACC || '0987873729';
  const holder = process.env.NEXT_PUBLIC_BANK_HOLDER || 'LE VAN SY';

  return NextResponse.json({ bank, acc, holder });
}
