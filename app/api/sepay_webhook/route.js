import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { sendEmail } from '../../../lib/resend';

export async function POST(request) {
  const data = await request.json();
  if (!data) return NextResponse.json({ status: 'error', message: 'No data' }, { status: 400 });
  
  const transfer_amount = data.transferAmount || 0;
  const content = data.content || '';
  
  const { data: orders } = await supabase.from('orders').select('*, customers(email)').eq('status', 'pending');
  
  let matched = false;
  if (orders) {
    for (const order of orders) {
      if (content.toUpperCase().includes(order.order_code.toUpperCase()) && parseInt(transfer_amount) >= parseInt(order.amount)) {
        await supabase.from('orders').update({ status: 'success' }).eq('order_code', order.order_code);
        matched = true;

        const customerEmail = order.customers?.email;
        if (customerEmail) {
          const htmlContent = `
            <p>Chào bạn,</p>
            <p>Cảm ơn bạn đã thanh toán thành công khóa học tại HerFit Wellness.</p>
            <ul>
              <li><strong>Mã đơn hàng:</strong> ${order.order_code}</li>
              <li><strong>Số tiền:</strong> ${new Intl.NumberFormat('vi-VN').format(order.amount)} đ</li>
              <li><strong>Trạng thái:</strong> THÀNH CÔNG</li>
            </ul>
            <p>Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất để hướng dẫn các bước tiếp theo.</p>
            <br/>
            <p>Thân mến,<br/>Lê Văn Sỹ</p>
          `;
          await sendEmail({
            to: customerEmail,
            subject: `Xác nhận thanh toán thành công đơn hàng ${order.order_code} - HerFit`,
            html: htmlContent
          });
        }

        break;
      }
    }
  }
  
  return NextResponse.json({ status: 'success', matched });
}
