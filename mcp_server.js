const express = require('express');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const sqlite3 = require('sqlite3').verbose();
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// Load environment variables
if (fs.existsSync('.env.local')) {
  require('dotenv').config({ path: '.env.local' });
} else {
  require('dotenv').config();
}

// SQLite database connection
const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, 'brain.db');
console.log(`Using SQLite Database at: ${dbPath}`);
const db = new sqlite3.Database(dbPath);

// Helper functions for SQLite using Promises
const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Check if customer table has email column
async function checkEmailColumn() {
  try {
    const columns = await dbAll("PRAGMA table_info(customers)");
    return columns.some(col => col.name === 'email');
  } catch (e) {
    console.error("Error checking columns:", e.message);
    return false;
  }
}

// Log helper
function logCall(functionName, args) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [MCP CALL] ${functionName} with args:`, JSON.stringify(args));
}

// Date helper for SQLite YYYY-MM-DD HH:MM:SS parsing
function parseSQLiteDate(dateStr) {
  if (!dateStr) return new Date(0);
  const parts = dateStr.split(/[- :]/);
  if (parts.length >= 6) {
    return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
  } else if (parts.length >= 3) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateStr);
}

// Initialize Resend
const resendApiKey = process.env.RESEND_API_KEY || '';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const server = new Server(
  {
    name: "herfit-mcp",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Register list tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_sales_report',
        description: 'Báo cáo doanh thu thực tế và số lượng đơn hàng từ SQLite database.',
        inputSchema: {
          type: 'object',
          properties: {
            date_range: {
              type: 'string',
              enum: ['today', 'yesterday', 'this_week', 'this_month'],
              description: 'Khoảng thời gian báo cáo (today, yesterday, this_week, this_month)'
            }
          },
          required: ['date_range']
        }
      },
      {
        name: 'confirm_payment',
        description: 'Xác nhận thanh toán thủ công cho một đơn hàng bằng mã đơn hàng và gửi email qua Resend.',
        inputSchema: {
          type: 'object',
          properties: {
            order_code: {
              type: 'string',
              description: 'Mã đơn hàng cần xác nhận (ví dụ: DH1234)'
            },
            payment_method: {
              type: 'string',
              description: 'Phương thức thanh toán (ví dụ: Manual Transfer)'
            }
          },
          required: ['order_code']
        }
      },
      {
        name: 'search_customer',
        description: 'Tra cứu thông tin khách hàng và lịch sử đơn hàng bằng tên, số điện thoại hoặc email.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Từ khóa tìm kiếm (tên, SĐT, hoặc email)'
            }
          },
          required: ['query']
        }
      }
    ]
  };
});

// Register call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logCall(name, args);

  try {
    if (name === 'get_sales_report') {
      const { date_range } = args;
      if (!['today', 'yesterday', 'this_week', 'this_month'].includes(date_range)) {
        return {
          content: [{ type: 'text', text: `Lỗi: date_range không hợp lệ. Chỉ chấp nhận: today, yesterday, this_week, this_month.` }],
          isError: true
        };
      }

      const now = new Date();
      let start, end;

      if (date_range === 'today') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (date_range === 'yesterday') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, -1);
      } else if (date_range === 'this_week') {
        const day = now.getDay() || 7;
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
        start.setHours(0, 0, 0, 0);
      } else if (date_range === 'this_month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const queryStr = `
        SELECT o.order_code, o.amount, o.status, o.order_date, c.name as customer_name, p.name as product_name
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN products p ON o.product_id = p.id
        ORDER BY o.order_date DESC
      `;

      const orders = await dbAll(queryStr);

      const filteredOrders = orders.filter(o => {
        const oDate = parseSQLiteDate(o.order_date);
        if (start && oDate < start) return false;
        if (end && oDate > end) return false;
        return true;
      });

      if (filteredOrders.length === 0) {
        return {
          content: [{ type: 'text', text: `Không có đơn hàng nào trong khoảng thời gian: ${date_range}.` }]
        };
      }

      const successOrders = filteredOrders.filter(o => o.status === 'success');
      const pendingOrders = filteredOrders.filter(o => o.status === 'pending');
      const totalRevenue = successOrders.reduce((sum, o) => sum + o.amount, 0);

      // Best seller product in this range
      const productCounts = {};
      successOrders.forEach(o => {
        if (o.product_name) {
          productCounts[o.product_name] = (productCounts[o.product_name] || 0) + 1;
        }
      });
      let bestSeller = 'Không có';
      let maxCount = 0;
      for (const prod in productCounts) {
        if (productCounts[prod] > maxCount) {
          maxCount = productCounts[prod];
          bestSeller = prod;
        }
      }

      let textResult = `### BÁO CÁO DOANH THU & ĐƠN HÀNG (${date_range.toUpperCase()})\n\n`;
      textResult += `* **Tổng doanh thu thực tế:** ${new Intl.NumberFormat('vi-VN').format(totalRevenue)} đ\n`;
      textResult += `* **Số đơn hàng đã thanh toán (Success):** ${successOrders.length}\n`;
      textResult += `* **Số đơn hàng đang chờ (Pending):** ${pendingOrders.length}\n`;
      textResult += `* **Khóa học bán chạy nhất:** ${bestSeller} (${maxCount} lượt mua)\n\n`;

      textResult += `#### Chi tiết các đơn hàng:\n`;
      filteredOrders.forEach(o => {
        const customerName = o.customer_name || 'Ẩn danh';
        const productName = o.product_name || 'Khóa học';
        textResult += `- **${o.order_code}** | ${customerName} | ${productName} | **${new Intl.NumberFormat('vi-VN').format(o.amount)} đ** | [${o.status.toUpperCase()}]\n`;
      });

      return {
        content: [{ type: 'text', text: textResult }]
      };

    } else if (name === 'confirm_payment') {
      const { order_code, payment_method = 'Manual Transfer' } = args;
      if (!order_code) {
        return {
          content: [{ type: 'text', text: `Lỗi: Thiếu mã đơn hàng order_code.` }],
          isError: true
        };
      }

      const hasEmail = await checkEmailColumn();
      const selectQuery = hasEmail
        ? `SELECT o.order_code, o.amount, o.status, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
           FROM orders o
           LEFT JOIN customers c ON o.customer_id = c.id
           WHERE o.order_code = ?`
        : `SELECT o.order_code, o.amount, o.status, c.name as customer_name, c.phone as customer_phone
           FROM orders o
           LEFT JOIN customers c ON o.customer_id = c.id
           WHERE o.order_code = ?`;

      const order = await dbGet(selectQuery, [order_code]);

      if (!order) {
        return {
          content: [{ type: 'text', text: `Lỗi: Không tìm thấy đơn hàng có mã: ${order_code}` }],
          isError: true
        };
      }

      if (order.status === 'success') {
        return {
          content: [{ type: 'text', text: `Đơn hàng **${order_code}** đã được xác nhận thanh toán thành công trước đó.` }]
        };
      }

      // Update order status to success
      await dbRun(`UPDATE orders SET status = 'success' WHERE order_code = ?`, [order_code]);

      let emailStatus = 'Không có email khách hàng để gửi thông báo.';
      const customerEmail = hasEmail ? order.customer_email : null;
      const customerName = order.customer_name || 'bạn';

      if (customerEmail && resend) {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'Lê Văn Sỹ <hi@academy.levansy.com>';
        const htmlContent = `
          <p>Chào ${customerName},</p>
          <p>Cảm ơn bạn đã thanh toán thành công khóa học tại HerFit Wellness (Duyệt thủ công qua Telegram).</p>
          <ul>
            <li><strong>Mã đơn hàng:</strong> ${order_code}</li>
            <li><strong>Số tiền:</strong> ${new Intl.NumberFormat('vi-VN').format(order.amount)} đ</li>
            <li><strong>Phương thức:</strong> ${payment_method}</li>
            <li><strong>Trạng thái:</strong> THÀNH CÔNG</li>
          </ul>
          <p>Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất để hướng dẫn các bước tiếp theo.</p>
          <br/>
          <p>Thân mến,<br/>Lê Văn Sỹ</p>
        `;

        try {
          const emailRes = await resend.emails.send({
            from: fromEmail,
            to: [customerEmail],
            subject: `Xác nhận thanh toán thành công đơn hàng ${order_code} - HerFit`,
            html: htmlContent
          });
          if (emailRes.error) {
            emailStatus = `Lỗi gửi email từ Resend: ${JSON.stringify(emailRes.error)}`;
          } else {
            emailStatus = `Đã tự động gửi email xác nhận thành công tới ${customerEmail}.`;
          }
        } catch (e) {
          emailStatus = `Lỗi hệ thống khi gửi email: ${e.message}`;
        }
      } else if (!resend) {
        emailStatus = 'Chưa cấu hình RESEND_API_KEY hoặc không khởi tạo được Resend.';
      }

      return {
        content: [{
          type: 'text',
          text: `🎉 Đã kích hoạt thanh toán thành công cho đơn hàng **${order_code}** (Số tiền: ${new Intl.NumberFormat('vi-VN').format(order.amount)} đ, Phương thức: ${payment_method}).\n👉 **Trạng thái Email:** ${emailStatus}`
        }]
      };

    } else if (name === 'search_customer') {
      const { query } = args;
      if (!query) {
        return {
          content: [{ type: 'text', text: `Lỗi: Từ khóa tìm kiếm query không được để trống.` }],
          isError: true
        };
      }

      const hasEmail = await checkEmailColumn();
      let selectCustomersSql = `SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? OR zalo LIKE ?`;
      const params = [`%${query}%`, `%${query}%`, `%${query}%`];
      if (hasEmail) {
        selectCustomersSql += ` OR email LIKE ?`;
        params.push(`%${query}%`);
      }

      const customers = await dbAll(selectCustomersSql, params);

      if (customers.length === 0) {
        return {
          content: [{ type: 'text', text: `Không tìm thấy khách hàng nào khớp với từ khóa: "${query}"` }]
        };
      }

      let textResult = `### KẾT QUẢ TÌM KIẾM KHÁCH HÀNG ("${query}")\n\n`;

      for (const c of customers) {
        textResult += `👤 **${c.name}**\n`;
        textResult += `- **SĐT:** ${c.phone || 'Không có'}\n`;
        if (hasEmail) {
          textResult += `- **Email:** ${c.email || 'Không có'}\n`;
        }
        textResult += `- **Zalo:** ${c.zalo || 'Không có'}\n`;
        textResult += `- **Ngày đăng ký:** ${c.register_date || 'Không có'}\n`;

        // Fetch customer orders
        const orders = await dbAll(`
          SELECT o.order_code, o.amount, o.status, o.order_date, p.name as product_name
          FROM orders o
          LEFT JOIN products p ON o.product_id = p.id
          WHERE o.customer_id = ?
          ORDER BY o.order_date DESC
        `, [c.id]);

        if (orders.length > 0) {
          textResult += `- **Lịch sử mua hàng (${orders.length} đơn):**\n`;
          orders.forEach(o => {
            const productName = o.product_name || 'Khóa học';
            textResult += `  * **${o.order_code}** | ${productName} | **${new Intl.NumberFormat('vi-VN').format(o.amount)} đ** | [${o.status.toUpperCase()}]\n`;
          });
        } else {
          textResult += `- *Chưa có lịch sử mua hàng.*\n`;
        }
        textResult += `\n---\n\n`;
      }

      return {
        content: [{ type: 'text', text: textResult }]
      };
    }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Lỗi khi thực thi công cụ: ${err.message}` }],
      isError: true
    };
  }
});

// Setup Express with SSE
const app = express();
app.use(express.json());

let transport = null;

app.get('/sse', async (req, res) => {
  console.log('Client connected to /sse');
  if (transport) {
    try {
      await transport.close();
    } catch (e) {
      // Ignore error
    }
  }
  server._transport = undefined;

  const heartbeatInterval = setInterval(() => {
    try {
      res.write(':\n\n');
    } catch (err) {
      // Ignore
    }
  }, 15000);

  res.on('close', () => {
    console.log('Client disconnected from /sse');
    clearInterval(heartbeatInterval);
    if (transport && transport.res === res) {
      transport = null;
    }
  });

  transport = new SSEServerTransport('/message', res);
  await server.connect(transport);
});

app.post('/message', async (req, res) => {
  console.log('Message received on /message:', JSON.stringify(req.body));
  if (transport && transport._sseResponse) {
    try {
      await transport.handlePostMessage(req, res, req.body);
    } catch (err) {
      console.error('Error handling message:', err);
      if (!res.headersSent) {
        res.status(404).send('Session terminated');
      }
    }
  } else {
    res.status(404).send('Session terminated');
  }
});

const PORT = process.env.MCP_PORT || 3001;
// Listen strictly on localhost (127.0.0.1) as requested
app.listen(PORT, '127.0.0.1', () => {
  console.log(`HerFit MCP Server listening on 127.0.0.1:${PORT}`);
});
