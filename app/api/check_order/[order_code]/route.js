import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(request, { params }) {
  const { order_code } = params;
  const { data, error } = await supabase.from('orders').select('status').eq('order_code', order_code).single();
  
  if (error || !data) {
    return NextResponse.json({ status: 'not_found' });
  }
  return NextResponse.json({ status: data.status });
}
