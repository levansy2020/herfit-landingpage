import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request) {
  const data = await request.json();
  if (!data) return NextResponse.json({ status: 'error', message: 'No data' }, { status: 400 });
  
  const transfer_amount = data.transferAmount || 0;
  const content = data.content || '';
  
  const { data: orders } = await supabase.from('orders').select('*').eq('status', 'pending');
  
  let matched = false;
  if (orders) {
    for (const order of orders) {
      if (content.toUpperCase().includes(order.order_code.toUpperCase()) && parseInt(transfer_amount) >= parseInt(order.amount)) {
        await supabase.from('orders').update({ status: 'success' }).eq('order_code', order.order_code);
        matched = true;
        break;
      }
    }
  }
  
  return NextResponse.json({ status: 'success', matched });
}
