const fs = require('fs');
const { Resend } = require('resend');

// Load environment variables
if (fs.existsSync('.env.local')) {
  require('dotenv').config({ path: '.env.local' });
} else {
  require('dotenv').config();
}

const apiKey = process.env.RESEND_API_KEY || (fs.existsSync('resend_config.txt') ? fs.readFileSync('resend_config.txt', 'utf8').trim() : '');
if (!apiKey) {
  console.error("LỖI: Chưa cấu hình RESEND_API_KEY trong .env và không tìm thấy file resend_config.txt!");
  process.exit(1);
}

const resend = new Resend(apiKey);
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Lê Văn Sỹ <hi@academy.levansy.com>';

async function test() {
  const r = await resend.emails.send({
    from: fromEmail,
    to: 'test+test@gmail.com',
    subject: 'Test email',
    html: '<p>test</p>'
  });
  console.log(r);
}

test();
