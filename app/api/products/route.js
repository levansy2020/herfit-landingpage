import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

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
