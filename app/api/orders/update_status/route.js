import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { sendEmail } from '../../../../lib/resend';

export async function POST(request) {
  const data = await request.json();
  const { error } = await supabase.from('orders')
    .update({ status: data.status })
    .eq('order_code', data.order_code);
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data.status === 'success') {
    // Fetch order details to get amount and customer email
    const { data: order } = await supabase.from('orders')
      .select('amount, customers(email)')
      .eq('order_code', data.order_code)
      .single();

    const customerEmail = order?.customers?.email;
    if (customerEmail) {
      const htmlContent = `
        <p>Chào bạn,</p>
        <p>Cảm ơn bạn đã thanh toán thành công khóa học tại HerFit Wellness.</p>
        <ul>
          <li><strong>Mã đơn hàng:</strong> ${data.order_code}</li>
          <li><strong>Số tiền:</strong> ${new Intl.NumberFormat('vi-VN').format(order.amount)} đ</li>
          <li><strong>Trạng thái:</strong> THÀNH CÔNG</li>
        </ul>
        <p>Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất để hướng dẫn các bước tiếp theo.</p>
        <br/>
        <p>Thân mến,<br/>Lê Văn Sỹ</p>
      `;
      await sendEmail({
        to: customerEmail,
        subject: `Xác nhận thanh toán thành công đơn hàng ${data.order_code} - HerFit`,
        html: htmlContent
      });
    }
  }

  return NextResponse.json({ status: 'success' });
}
