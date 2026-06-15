global.WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
if (fs.existsSync('.env.local')) {
  require('dotenv').config({ path: '.env.local' });
} else {
  require('dotenv').config();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const db = new sqlite3.Database('brain.db');

async function migrate() {
  console.log('Bắt đầu migrate dữ liệu từ brain.db sang Supabase...');

  // 1. Migrate products
  db.all('SELECT * FROM products', async (err, rows) => {
    if (rows && rows.length > 0) {
      const { error } = await supabase.from('products').insert(rows.map(r => ({
        id: r.id, name: r.name, price: r.price, description: r.description, quantity: r.quantity
      })));
      if(error) console.error('Lỗi products:', error.message);
      else console.log('Đã chuyển', rows.length, 'sản phẩm.');
    }

    // 2. Migrate customers
    db.all('SELECT * FROM customers', async (err, cRows) => {
      if (cRows && cRows.length > 0) {
        const { error } = await supabase.from('customers').insert(cRows.map(c => ({
          id: c.id, name: c.name, phone: c.phone, zalo: c.zalo, register_date: c.register_date
        })));
        if(error) console.error('Lỗi customers:', error.message);
        else console.log('Đã chuyển', cRows.length, 'khách hàng.');
      }

      // 3. Migrate orders
      db.all('SELECT * FROM orders', async (err, oRows) => {
        if (oRows && oRows.length > 0) {
          const { error } = await supabase.from('orders').insert(oRows.map(o => ({
            order_code: o.order_code, customer_id: o.customer_id, product_id: o.product_id,
            amount: o.amount, status: o.status, order_date: o.order_date
          })));
          if(error) console.error('Lỗi orders:', error.message);
          else console.log('Đã chuyển', oRows.length, 'đơn hàng.');
        }
        console.log('Hoàn thành migrate!');
      });
    });
  });
}

migrate();
