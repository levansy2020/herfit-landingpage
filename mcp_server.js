const express = require('express');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

// Add global WebSocket polyfill for Supabase under Node.js < 22
global.WebSocket = require('ws');

const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// Load environment variables
if (fs.existsSync('.env.local')) {
  require('dotenv').config({ path: '.env.local' });
} else {
  require('dotenv').config();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

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
        description: 'Báo cáo doanh thu thực tế và số lượng đơn hàng thành công/đang chờ từ Supabase.',
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
        description: 'Xác nhận thanh toán thủ công cho một đơn hàng bằng mã đơn hàng và tự động gửi email kích hoạt qua Resend.',
        inputSchema: {
          type: 'object',
          properties: {
            order_code: {
              type: 'string',
              description: 'Mã đơn hàng cần xác nhận (ví dụ: DH1234)'
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

  try {
    if (name === 'get_sales_report') {
      const { date_range } = args;
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
      } else if (date_range === 'this_month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      let query = supabase.from('orders')
        .select('*, customers(name, email), products(name)')
        .gte('order_date', start.toISOString());
        
      if (end) {
        query = query.lte('order_date', end.toISOString());
      }

      const { data: orders, error } = await query;
      if (error) throw new Error(`Supabase query error: ${error.message}`);

      if (!orders || orders.length === 0) {
        return {
          content: [{ type: 'text', text: `Không có đơn hàng nào trong khoảng thời gian: ${date_range}.` }]
        };
      }

      const successOrders = orders.filter(o => o.status === 'success');
      const pendingOrders = orders.filter(o => o.status === 'pending');
      const totalRevenue = successOrders.reduce((sum, o) => sum + o.amount, 0);

      let textResult = `### BÁO CÁO DOANH THU & ĐƠN HÀNG (${date_range.toUpperCase()})\n\n`;
      textResult += `* **Tổng doanh thu thực tế:** ${new Intl.NumberFormat('vi-VN').format(totalRevenue)} đ\n`;
      textResult += `* **Số đơn hàng đã thanh toán (Success):** ${successOrders.length}\n`;
      textResult += `* **Số đơn hàng đang chờ (Pending):** ${pendingOrders.length}\n\n`;

      textResult += `#### Chi tiết các đơn hàng:\n`;
      orders.forEach(o => {
        const customerName = o.customers ? o.customers.name : 'Ẩn danh';
        const productName = o.products ? o.products.name : 'Khóa học';
        textResult += `- **${o.order_code}** | ${customerName} | ${productName} | **${new Intl.NumberFormat('vi-VN').format(o.amount)} đ** | [${o.status.toUpperCase()}]\n`;
      });

      return {
        content: [{ type: 'text', text: textResult }]
      };

    } else if (name === 'confirm_payment') {
      const { order_code } = args;

      // 1. Check order details
      const { data: order, error } = await supabase.from('orders')
        .select('*, customers(email, name)')
        .eq('order_code', order_code)
        .single();

      if (error || !order) {
        throw new Error(`Không tìm thấy đơn hàng có mã: ${order_code}`);
      }

      if (order.status === 'success') {
        return {
          content: [{ type: 'text', text: `Đơn hàng **${order_code}** đã được xác nhận thanh toán thành công trước đó.` }]
        };
      }

      // 2. Update status to success
      const { error: updateError } = await supabase.from('orders')
        .update({ status: 'success' })
        .eq('order_code', order_code);

      if (updateError) {
        throw new Error(`Lỗi cập nhật trạng thái đơn hàng: ${updateError.message}`);
      }

      let emailStatus = 'Không có email khách hàng để gửi thông báo.';
      const customerEmail = order.customers?.email;
      const customerName = order.customers?.name || 'bạn';

      // 3. Send email confirmation via Resend
      if (customerEmail) {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'Lê Văn Sỹ <hi@levansy.com>';
        const htmlContent = `
          <p>Chào ${customerName},</p>
          <p>Cảm ơn bạn đã thanh toán thành công khóa học tại HerFit Wellness (Duyệt thủ công qua Telegram).</p>
          <ul>
            <li><strong>Mã đơn hàng:</strong> ${order_code}</li>
            <li><strong>Số tiền:</strong> ${new Intl.NumberFormat('vi-VN').format(order.amount)} đ</li>
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
      }

      return {
        content: [{
          type: 'text',
          text: `🎉 Đã kích hoạt thanh toán thành công cho đơn hàng **${order_code}** (Số tiền: ${new Intl.NumberFormat('vi-VN').format(order.amount)} đ).\n👉 **Trạng thái Email:** ${emailStatus}`
        }]
      };

    } else if (name === 'search_customer') {
      const { query } = args;

      // Search customer by name, email, or phone
      const { data: customers, error } = await supabase.from('customers')
        .select('*')
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`);

      if (error) throw new Error(`Supabase query error: ${error.message}`);

      if (!customers || customers.length === 0) {
        return {
          content: [{ type: 'text', text: `Không tìm thấy khách hàng nào khớp với từ khóa: "${query}"` }]
        };
      }

      let textResult = `### KẾT QUẢ TÌM KIẾM KHÁCH HÀNG ("${query}")\n\n`;

      for (const c of customers) {
        textResult += `👤 **${c.name}**\n`;
        textResult += `- **SĐT:** ${c.phone}\n`;
        textResult += `- **Email:** ${c.email || 'Không có'}\n`;
        textResult += `- **Zalo:** ${c.zalo || 'Không có'}\n`;
        textResult += `- **Ngày đăng ký:** ${new Date(c.register_date).toLocaleDateString('vi-VN')}\n`;

        // Fetch customer orders
        const { data: orders } = await supabase.from('orders')
          .select('*, products(name)')
          .eq('customer_id', c.id);

        if (orders && orders.length > 0) {
          textResult += `- **Lịch sử mua hàng (${orders.length} đơn):**\n`;
          orders.forEach(o => {
            const productName = o.products ? o.products.name : 'Khóa học';
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
  // Force reset server transport reference to prevent "Already connected" error
  server._transport = undefined;

  transport = new SSEServerTransport('/message', res);
  await server.connect(transport);
});

app.post('/message', async (req, res) => {
  console.log('Message received on /message:', JSON.stringify(req.body));
  if (transport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(500).send('SSE connection not active');
  }
});

const PORT = process.env.MCP_PORT || 3001;
app.listen(PORT, () => {
  console.log(`HerFit MCP Server listening on port ${PORT}`);
});
