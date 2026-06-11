import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { data, error } = await supabase.from('customers')
    .update({ name: 'Lê Dương Gia Phúc V2' })
    .eq('id', 1)
    .select();
  return NextResponse.json({ data, error });
}
