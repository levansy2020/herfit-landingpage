import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html }) {
  try {
    const data = await resend.emails.send({
      from: 'Lê Văn Sỹ <hi@levansy.com>', // Sẽ thay bằng email domain riêng của bạn
      to: [to],
      subject: subject,
      html: html,
    });
    return { success: true, data };
  } catch (error) {
    console.error('Lỗi gửi email:', error);
    return { success: false, error };
  }
}
