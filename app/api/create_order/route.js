import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request) {
  const data = await request.json();
  
  // 1. Find or insert customer
  let cust_id = null;
  const { data: existingCust } = await supabase.from('customers').select('id').eq('phone', data.contact).single();
  
  if (existingCust) {
    cust_id = existingCust.id;
  } else {
    const { data: newCust, error: errC } = await supabase.from('customers')
      .insert([{ name: data.name, phone: data.contact }])
      .select('id').single();
    if (errC) return NextResponse.json({ error: errC.message }, { status: 500 });
    cust_id = newCust.id;
  }
  
  // 2. Find product by price
  const { data: prod } = await supabase.from('products').select('id, quantity').eq('price', data.price).single();
  const prod_id = prod ? prod.id : null;
  
  if (prod_id && prod.quantity > 0) {
    await supabase.from('products').update({ quantity: prod.quantity - 1 }).eq('id', prod_id);
  }
  
  // 3. Create order
  const { error: errO } = await supabase.from('orders').insert([{
    order_code: data.orderId,
    customer_id: cust_id,
    product_id: prod_id,
    amount: data.price,
    status: data.status
  }]);
  
  if (errO) return NextResponse.json({ error: errO.message }, { status: 500 });
  return NextResponse.json({ status: 'success' });
}
