import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { sendEmail } from '../../../lib/resend';

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

  if (data.email) {
    const htmlContent = `
      <p>Chào bạn,</p>
      <p>Cảm ơn bạn đã đặt hàng tại HerFit Wellness. Đơn hàng của bạn đã được ghi nhận thành công.</p>
      <ul>
        <li><strong>Mã đơn hàng:</strong> ${data.order_code}</li>
        <li><strong>Số tiền:</strong> ${new Intl.NumberFormat('vi-VN').format(data.amount)} đ</li>
        <li><strong>Trạng thái:</strong> ${data.status.toUpperCase()}</li>
      </ul>
      <p>Nếu có bất kỳ thắc mắc nào, cứ reply lại email này nhé.</p>
      <br/>
      <p>Thân mến,<br/>Lê Văn Sỹ</p>
    `;
    await sendEmail({
      to: data.email,
      subject: `Xác nhận đơn hàng ${data.order_code} - HerFit`,
      html: htmlContent
    });
  }

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
