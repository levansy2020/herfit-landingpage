import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request) {
  const data = await request.json();
  const { error } = await supabase.from('orders')
    .update({ status: data.status })
    .eq('order_code', data.order_code);
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'success' });
}
