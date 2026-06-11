import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET() {
  const { data, error } = await supabase.from('products').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request) {
  const data = await request.json();
  const { error } = await supabase.from('products').insert([
    { name: data.name, price: data.price, description: data.description, quantity: data.quantity }
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'success' });
}

export async function PUT(request) {
  const data = await request.json();
  const { error } = await supabase.from('products')
    .update({ name: data.name, price: data.price, quantity: data.quantity })
    .eq('id', data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'success' });
}

export async function DELETE(request) {
  const data = await request.json();
  const { error } = await supabase.from('products').delete().eq('id', data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'success' });
}
