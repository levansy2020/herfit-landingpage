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
          // Sản phẩm số: map theo số tiền -> link tải file (suy ra domain từ request, không hardcode)
          const origin = new URL(request.url).origin;
          const DIGITAL_PRODUCTS = {
            49000: { name: 'HerFit Home & Gym — Chương trình tự tập 4 tuần', path: '/san-pham/herfit-home-gym/HerFit-Home-Gym-4-tuan.html' },
            2000:  { name: 'HerFit Home & Gym (đơn test)', path: '/san-pham/herfit-home-gym/HerFit-Home-Gym-4-tuan.html' },
          };
          const product = DIGITAL_PRODUCTS[parseInt(order.amount)];

          let htmlContent;
          if (product) {
            const downloadUrl = origin + product.path;
            htmlContent = `
              <p>Chào bạn,</p>
              <p>Cảm ơn bạn đã mua <strong>${product.name}</strong>. HerFit gửi bạn link tải file ngay bên dưới — bạn có thể tải lại bất cứ lúc nào.</p>
              <p style="margin:24px 0;">
                <a href="${downloadUrl}" style="background:#e81d60;color:#fff;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:100px;display:inline-block;">Tải / mở chương trình</a>
              </p>
              <p style="font-size:13px;color:#666;">Mẹo: mở file rồi bấm Ctrl/Cmd + P → "Save as PDF" để lưu về máy.</p>
              <ul>
                <li><strong>Mã đơn hàng:</strong> ${order.order_code}</li>
                <li><strong>Số tiền:</strong> ${new Intl.NumberFormat('vi-VN').format(order.amount)} đ</li>
              </ul>
              <p>Chúc bạn tập luyện vui và bền vững.</p>
              <br/>
              <p>Thân mến,<br/>HerFit — Tập luyện tử tế</p>
            `;
          } else {
            htmlContent = `
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
          }
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
