const express = require('express');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { isInitializeRequest, CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { randomUUID } = require('crypto');

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

console.log("Initializing Supabase Client...");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Initialize Resend
const resendApiKey = process.env.RESEND_API_KEY || '';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Log helper
function logCall(functionName, args) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [MCP CALL] ${functionName} with args:`, JSON.stringify(args));
}

function createMcpServer() {
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
        description: 'Báo cáo doanh thu thực tế và số lượng đơn hàng từ Supabase.',
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
      },
      {
        name: 'get_new_leads',
        description: 'Lấy danh sách các khách hàng mới đăng ký qua form/waitlist chưa được thông báo và tự động đánh dấu đã thông báo.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_morning_report',
        description: 'Tổng hợp số lượng đơn hàng thành công, tổng doanh thu và số lượng khách đăng ký mới trong 24 giờ qua.',
        inputSchema: {
          type: 'object',
          properties: {}
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

      // Best seller product in this range
      const productCounts = {};
      successOrders.forEach(o => {
        const prodName = o.products ? o.products.name : null;
        if (prodName) {
          productCounts[prodName] = (productCounts[prodName] || 0) + 1;
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
      orders.forEach(o => {
        const customerName = o.customers ? o.customers.name : 'Ẩn danh';
        const productName = o.products ? o.products.name : 'Khóa học';
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

      // 1. Check order details
      const { data: order, error } = await supabase.from('orders')
        .select('*, customers(email, name)')
        .eq('order_code', order_code)
        .single();

      if (error || !order) {
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
        textResult += `- **SĐT:** ${c.phone || 'Không có'}\n`;
        textResult += `- **Email:** ${c.email || 'Không có'}\n`;
        textResult += `- **Zalo:** ${c.zalo || 'Không có'}\n`;
        textResult += `- **Ngày đăng ký:** ${c.register_date ? new Date(c.register_date).toLocaleDateString('vi-VN') : 'Không có'}\n`;

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

    } else if (name === 'get_new_leads') {
      // 1. Fetch new leads
      const { data: leads, error: fetchError } = await supabase.from('customers')
        .select('*')
        .or('notified.eq.false,notified.is.null')
        .order('register_date', { ascending: true });

      if (fetchError) {
        throw new Error(`Lỗi truy vấn khách hàng mới: ${fetchError.message}`);
      }

      if (!leads || leads.length === 0) {
        return {
          content: [{ type: 'text', text: 'Không có khách hàng mới đăng ký chưa thông báo.' }]
        };
      }

      // 2. Process leads and calculate daily indices
      const maskPhone = (phone) => {
        if (!phone) return 'Không có';
        if (phone.length <= 3) return 'xxx';
        return phone.slice(0, -3) + 'xxx';
      };

      const getPronoun = (fullName) => {
        const nameLower = fullName.toLowerCase();
        if (nameLower.includes(' thị ') || nameLower.endsWith(' thị')) return 'Chị';
        if (nameLower.includes(' văn ') || nameLower.includes(' đức ') || nameLower.includes(' minh ') || nameLower.includes(' tuấn ')) return 'Anh';
        return 'Khách hàng';
      };

      let textResult = `🔔 **THÔNG BÁO KHÁCH HÀNG MỚI ĐĂNG KÝ**\n\n`;
      const processedLeads = [];

      for (const lead of leads) {
        const pronoun = getPronoun(lead.name);
        const lastName = lead.name.split(' ').pop();
        const displayName = pronoun === 'Khách hàng' ? lead.name : `${pronoun} ${lastName}`;
        const maskedPhone = maskPhone(lead.phone);
        
        let indexToday = 1;
        try {
          const regDate = new Date(lead.register_date || new Date());
          // Chuyển sang múi giờ Việt Nam (+7) để tính ngày
          const vnTime = new Date(regDate.getTime() + 7 * 60 * 60 * 1000);
          const yyyy = vnTime.getUTCFullYear();
          const mm = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(vnTime.getUTCDate()).padStart(2, '0');
          const startOfDay = new Date(`${yyyy}-${mm}-${dd}T00:00:00+07:00`).toISOString();
          const leadTime = regDate.toISOString();

          const { count, error: countError } = await supabase.from('customers')
            .select('*', { count: 'exact', head: true })
            .gte('register_date', startOfDay)
            .lte('register_date', leadTime);

          if (!countError && count !== null) {
            indexToday = count;
          }
        } catch (e) {
          console.error('Lỗi tính số thứ tự trong ngày:', e);
        }

        textResult += `👉 ${displayName} vừa điền form, SĐT ${maskedPhone}. Khách thứ ${indexToday} hôm nay.\n`;
        processedLeads.push({
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          register_date: lead.register_date,
          index_today: indexToday
        });
      }

      // 3. Mark as notified
      const leadIds = leads.map(l => l.id);
      const { error: updateError } = await supabase.from('customers')
        .update({ notified: true })
        .in('id', leadIds);

      if (updateError) {
        console.error('Lỗi cập nhật trạng thái đã thông báo:', updateError.message);
      }

      return {
        content: [
          { type: 'text', text: textResult }
        ]
      };
    } else if (name === 'get_morning_report') {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // 1. Fetch successful orders in last 24 hours
      const { data: orders, error: ordersError } = await supabase.from('orders')
        .select('*')
        .eq('status', 'success')
        .gte('order_date', twentyFourHoursAgo.toISOString())
        .lte('order_date', now.toISOString());

      if (ordersError) {
        throw new Error(`Lỗi truy vấn đơn hàng 24h qua: ${ordersError.message}`);
      }

      // 2. Fetch new customers in last 24 hours
      const { data: customers, error: customersError } = await supabase.from('customers')
        .select('*')
        .gte('register_date', twentyFourHoursAgo.toISOString())
        .lte('register_date', now.toISOString());

      if (customersError) {
        throw new Error(`Lỗi truy vấn khách hàng mới 24h qua: ${customersError.message}`);
      }

      const successCount = orders ? orders.length : 0;
      const totalRevenue = orders ? orders.reduce((sum, o) => sum + o.amount, 0) : 0;
      const newCustomersCount = customers ? customers.length : 0;

      // 3. Format revenue (e.g. 1.200.000 đ -> 1,2tr)
      let formattedRevenue = '0đ';
      if (totalRevenue > 0) {
        if (totalRevenue >= 1000000) {
          const rawMillions = totalRevenue / 1000000;
          if (Number.isInteger(rawMillions)) {
            formattedRevenue = `${rawMillions}tr`;
          } else {
            formattedRevenue = `${rawMillions.toFixed(1).replace('.', ',')}tr`;
          }
        } else {
          formattedRevenue = `${new Intl.NumberFormat('vi-VN').format(totalRevenue)}đ`;
        }
      }

      // Vietnam local hour for display
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: 'numeric',
        hour12: false
      });
      const hour = parseInt(formatter.format(now), 10);

      let timeOfDay = 'sáng';
      if (hour >= 12 && hour < 18) {
        timeOfDay = 'chiều';
      } else if (hour >= 18 || hour < 4) {
        timeOfDay = 'tối';
      }

      const textResult = `${hour}h ${timeOfDay}. 24h qua chốt ${successCount} đơn, ${formattedRevenue}. ${newCustomersCount} khách mới điền form.`;

      return {
        content: [
          { type: 'text', text: textResult }
        ]
      };
    }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Lỗi khi thực thi công cụ: ${err.message}` }],
      isError: true
    };
  }
  });

  return server;
}

// Setup Express for Streamable HTTP
const app = express();
app.use(express.json());

// Map to store transports by session ID
const transports = {};

// MCP POST endpoint
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (sessionId) {
    console.log(`Received MCP request for session: ${sessionId}`);
  } else {
    console.log('Request body:', JSON.stringify(req.body));
  }

  try {
    let transport;
    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          console.log(`Session initialized with ID: ${sid}`);
          transports[sid] = transport;
        }
      });

      // Set up onclose handler to clean up transport when closed
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          console.log(`Transport closed for session ${sid}, removing from transports map`);
          delete transports[sid];
        }
      };

      // Connect the transport to the MCP server BEFORE handling the request
      const connServer = createMcpServer();
      await connServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return; // Already handled
    } else {
      // Invalid request - no session ID or not initialization request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided'
        },
        id: null
      });
      return;
    }

    // Handle the request with existing transport
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null
      });
    }
  }
});

// MCP GET endpoint (SSE stream establishment)
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] || req.query['sessionId'] || req.query['session_id'];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  console.log(`Establishing SSE stream for session ${sessionId}`);
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

// MCP DELETE endpoint (session termination)
app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] || req.query['sessionId'] || req.query['session_id'];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  console.log(`Received session termination request for session ${sessionId}`);
  try {
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error('Error handling session termination:', error);
    if (!res.headersSent) {
      res.status(500).send('Error processing session termination');
    }
  }
});

const PORT = process.env.MCP_PORT || 3001;
// Listen on 0.0.0.0 so goClaw container can connect via Docker host-gateway,
// while public access is fully blocked by VPS firewall (UFW).
app.listen(PORT, '0.0.0.0', () => {
  console.log(`HerFit MCP Server listening on 0.0.0.0:${PORT}`);
});

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  for (const sessionId in transports) {
    try {
      console.log(`Closing transport for session ${sessionId}`);
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  console.log('Server shutdown complete');
  process.exit(0);
});
