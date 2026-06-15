import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { sendEmail } from '../../../lib/resend';

export async function POST(request) {
  try {
    const data = await request.json();
    const { name, phone, email } = data;

    if (!name || !phone || !email) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // Lưu vào bảng customers
    const { error: dbError } = await supabase.from('customers').insert([
      { name, phone, email, zalo: phone }
    ]);
    
    // Bỏ qua lỗi trùng lặp nếu người dùng đăng ký nhiều lần
    if (dbError && dbError.code !== '23505') {
      console.error('Database Error:', dbError);
    }

    const isTest = email.includes('+test');

    // Email 1: Chào mừng (Gửi ngay lập tức)
    const email1Content = `
      <p>Chào ${name},</p>
      <p>Mình là Sỹ (mọi người hay gọi là Sỹ Lê), người sáng lập HerFit Wellness. Rất vui vì bạn đã để lại thông tin và quan tâm đến định hướng trở thành một Fitness Coach chuyên nghiệp.</p>
      <p>Mình viết email này không để bán cho bạn thứ gì cả. Mình chỉ muốn nói một câu cảm ơn ngắn gọn vì bạn đã cho mình cơ hội được kết nối.</p>
      <p>Có thể bạn đang phân vân không biết mình có hợp với nghề PT hay không, hoặc bạn sợ cái cảnh phải "chèo kéo, ép số" khách hàng. Đừng lo, bạn không cô đơn đâu. Những ngày tới, mình sẽ gửi cho bạn một vài góc nhìn thực tế nhất về nghề PT – những thứ mà không trường lớp nào dạy bạn.</p>
      <p>Nhớ check email của mình nhé!</p>
      <br>
      <p>Thân mến,<br>Lê Văn Sỹ</p>
    `;

    // Email 2: Nurture (Gửi sau 2 ngày)
    const email2Content = `
      <p>Chào ${name},</p>
      <p>Hôm nay mình muốn kể cho bạn nghe một sai lầm lớn nhất mà 90% PT mới ra nghề đều mắc phải: <strong>Cố gắng chứng minh mình giỏi bằng cách nhồi nhét quá nhiều kiến thức vào đầu khách hàng ngay buổi đầu tiên.</strong></p>
      <p>Kết quả? Khách hàng sợ hãi và bỏ chạy.</p>
      <p>Sự thật là, đặc biệt với khách hàng nữ, họ không cần một vị giáo sư phân tích sinh lý học. Họ cần một người biết lắng nghe, thấu cảm được nỗi sợ "tập tạ sẽ bị thô", nỗi đau khi bị body shaming, và quan trọng nhất: Họ cần sự an toàn.</p>
      <p>Nghề PT không phải là nghề ép số. Nó là nghề <strong>dịch vụ chăm sóc con người</strong>. Khi bạn tư vấn bằng sự chân thành, thiết kế bài tập chuẩn y khoa, và đối xử với họ tử tế, tự động khách hàng sẽ muốn gắn bó với bạn. Chốt sale lúc này trở thành một điều hiển nhiên chứ không phải là sự chèo kéo.</p>
      <p>Đó cũng là triết lý mà mình luôn dạy các bạn HLV tại HerFit. Hãy dùng cái tâm để làm nghề, rồi tiền sẽ tự đến.</p>
      <p>Ngày mai, mình sẽ bật mí cho bạn cách để sở hữu trọn bộ tư duy này nhé.</p>
      <br>
      <p>Thân mến,<br>Lê Văn Sỹ</p>
    `;

    // Email 3: Chốt Sale (Gửi sau 3 ngày từ lúc đăng ký / 1 ngày sau email 2)
    const email3Content = `
      <p>Chào ${name},</p>
      <p>Mấy ngày qua chúng ta đã nói nhiều về tư duy "Dịch vụ tử tế" trong ngành Fitness. Hôm nay, mình muốn chính thức mời bạn bước vào con đường đó.</p>
      <p>Khóa đào tạo <strong>HerFit Trainer K1</strong> chính thức mở cổng tuyển sinh.</p>
      <p>Đây không phải là khóa học dạy bạn cách gồng mình lên để sale bất chấp. Đây là bệ phóng giúp bạn:</p>
      <ul>
        <li>Nắm vững kiến thức giải phẫu và dinh dưỡng chuẩn y khoa chuyên biệt cho nữ giới.</li>
        <li>Sở hữu kỹ năng đứng lớp tự tin, chỉnh sửa tư thế chuẩn xác.</li>
        <li>Biết cách nắm bắt tâm lý khách hàng nữ để chốt sale tinh tế, tự nhiên nhất.</li>
        <li>Và quan trọng: Cơ hội được làm việc trực tiếp tại hệ thống HerFit Wellness nếu bạn thực sự xuất sắc.</li>
      </ul>
      <p>Đặc biệt, 10 bạn đăng ký sớm nhất sẽ nhận được <strong>Học bổng 50%</strong>.</p>
      <p>Cơ hội không có nhiều. Hãy bấm vào link bên dưới để xem toàn bộ lộ trình học và giữ chỗ cho mình nhé:</p>
      <p>👉 <strong><a href="https://academy.levansy.com/">Giữ chỗ khóa HerFit Trainer K1 ngay!</a></strong></p>
      <p>Nếu bạn có bất kỳ câu hỏi nào, cứ reply lại email này, mình sẽ trực tiếp giải đáp. Hẹn gặp lại bạn ở lớp học!</p>
      <br>
      <p>Thân mến,<br>Lê Văn Sỹ</p>
    `;

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.log('Chưa có API key Resend, bỏ qua việc gửi email');
      return NextResponse.json({ status: 'success', message: 'Lưu thành công, bỏ qua email' });
    }

    const { Resend } = require('resend');
    const resend = new Resend(resendApiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Lê Văn Sỹ <hi@levansy.com>';

    if (isTest) {
      // Chế độ test: Gửi cả 3 email ngay lập tức nhưng cách nhau 1 giây để tránh Rate Limit của Resend
      const r1 = await resend.emails.send({ from: fromEmail, to: email, subject: 'Chào bạn, mừng bạn đến với cộng đồng HerFit! 👋', html: email1Content });
      await new Promise(resolve => setTimeout(resolve, 1000));
      const r2 = await resend.emails.send({ from: fromEmail, to: email, subject: 'Sự thật về chốt sale: Bạn không cần phải "ép" khách hàng mua thẻ', html: email2Content });
      await new Promise(resolve => setTimeout(resolve, 1000));
      const r3 = await resend.emails.send({ from: fromEmail, to: email, subject: 'Cánh cửa trở thành PT chuyên nghiệp (Không ép sale, không body shaming) đã mở', html: email3Content });
      
      if (r1.error || r2.error || r3.error) {
        throw new Error(`Resend Error: ${JSON.stringify(r1.error || r2.error || r3.error)}`);
      }
    } else {
      // Gửi thực tế: Sử dụng scheduledAt
      const now = new Date();
      
      const day2 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const day3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      // Gửi Email 1 ngay
      const r1 = await resend.emails.send({ 
        from: fromEmail, 
        to: email, 
        subject: 'Chào bạn, mừng bạn đến với cộng đồng HerFit! 👋', 
        html: email1Content 
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Gửi Email 2 sau 2 ngày
      const r2 = await resend.emails.send({ 
        from: fromEmail, 
        to: email, 
        subject: 'Sự thật về chốt sale: Bạn không cần phải "ép" khách hàng mua thẻ', 
        html: email2Content,
        scheduledAt: day2.toISOString()
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Gửi Email 3 sau 3 ngày
      const r3 = await resend.emails.send({ 
        from: fromEmail, 
        to: email, 
        subject: 'Cánh cửa trở thành PT chuyên nghiệp (Không ép sale, không body shaming) đã mở', 
        html: email3Content,
        scheduledAt: day3.toISOString()
      });
      
      if (r1.error || r2.error || r3.error) {
        throw new Error(`Resend Error: ${JSON.stringify(r1.error || r2.error || r3.error)}`);
      }
    }

    return NextResponse.json({ status: 'success' });

  } catch (error) {
    console.error('Subscribe Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
