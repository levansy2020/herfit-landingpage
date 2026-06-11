const { Resend } = require('resend');
const fs = require('fs');
const resend = new Resend(fs.readFileSync('resend_config.txt', 'utf8').trim());

async function test() {
  const r = await resend.emails.send({
    from: 'Lê Văn Sỹ <hi@academy.levansy.com>',
    to: 'test+test@gmail.com',
    subject: 'Test email',
    html: '<p>test</p>'
  });
  console.log(r);
}

test();
