import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET() {
  const { data, error } = await supabase.from('orders').select(`
    order_code,
    amount,
    status,
    order_date,
    customer_name,
    customers ( name ),
    products ( name )
  `).order('order_date', { ascending: false });
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  const formatted = data.map(o => ({
    order_code: o.order_code,
    amount: o.amount,
    status: o.status,
    order_date: o.order_date,
    customer_name: o.customer_name || o.customers?.name,
    product_name: o.products?.name
  }));
  
  return NextResponse.json(formatted);
}

export async function POST(request) {
  const data = await request.json();
  const { error } = await supabase.from('orders').insert([
    { order_code: data.order_code, amount: data.amount, status: data.status }
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'success' });
}

export async function PUT(request) {
  const data = await request.json();
  const { error } = await supabase.from('orders')
    .update({ status: data.status, amount: data.amount })
    .eq('order_code', data.order_code);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'success' });
}

export async function DELETE(request) {
  const data = await request.json();
  const { error } = await supabase.from('orders').delete().eq('order_code', data.order_code);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'success' });
}
