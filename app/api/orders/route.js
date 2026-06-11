import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  const { data, error } = await supabase.from('orders').select(`
    order_code,
    amount,
    status,
    order_date,
    customers ( name ),
    products ( name )
  `).order('order_date', { ascending: false });
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  // Flatten response to match existing frontend
  const formatted = data.map(o => ({
    order_code: o.order_code,
    amount: o.amount,
    status: o.status,
    order_date: o.order_date,
    customer_name: o.customers?.name,
    product_name: o.products?.name
  }));
  
  return NextResponse.json(formatted);
}
