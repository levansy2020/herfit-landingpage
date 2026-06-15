# Hướng dẫn Deploy HerFit MCP Server (Supabase + Streamable HTTP)

Tài liệu này hướng dẫn cách deploy và chạy dịch vụ HerFit MCP Server sử dụng Supabase và Streamable HTTP Transport trên VPS Ubuntu.

## 🚀 1. Chuẩn bị môi trường
MCP Server được tích hợp trực tiếp vào dự án Next.js hiện tại, chạy thông qua Node.js (cổng `3001`).

1. Đảm bảo đã cài đặt đầy đủ các thư viện cần thiết:
   ```bash
   npm install
   ```
2. Các biến môi trường cần cấu hình trong file `.env` hoặc `.env.local` tại thư mục gốc dự án (`/opt/my-website`):
   ```ini
   # API Key cho Resend gửi email duyệt thanh toán
   RESEND_API_KEY=re_xxx
   RESEND_FROM_EMAIL=Lê Văn Sỹ <hi@academy.levansy.com>

   # Cấu hình Supabase kết nối Database
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx

   # Cổng chạy MCP (Mặc định: 3001)
   MCP_PORT=3001
   ```

---

## 🛠️ 2. Cấu hình chạy ngầm với Systemd Service
Tạo một service chạy ngầm trên VPS để đảm bảo MCP Server tự động khởi động cùng hệ thống và tự động restart nếu gặp sự cố.

1. Tạo file cấu hình service tại đường dẫn `/etc/systemd/system/herfit-mcp.service`:
   ```bash
   sudo nano /etc/systemd/system/herfit-mcp.service
   ```

2. Dán nội dung cấu hình mẫu sau đây (hãy điều chỉnh lại `User` và `WorkingDirectory` cho chính xác nếu cần):
   ```ini
   [Unit]
   Description=HerFit MCP Server (Supabase + Streamable HTTP)
   After=network.target

   [Service]
   Type=simple
   User=root
   WorkingDirectory=/opt/my-website
   ExecStart=/usr/bin/node mcp_server.js
   Restart=on-failure
   Environment=NODE_ENV=production
   Environment=MCP_PORT=3001

   [Install]
   WantedBy=multi-user.target
   ```

3. Nạp lại cấu hình systemd và khởi chạy service:
   ```bash
   # Nạp lại cấu hình systemd
   sudo systemctl daemon-reload

   # Kích hoạt chạy cùng hệ thống
   sudo systemctl enable herfit-mcp

   # Khởi chạy dịch vụ
   sudo systemctl start herfit-mcp

   # Kiểm tra trạng thái hoạt động
   sudo systemctl status herfit-mcp
   ```

---

## 🛡️ 3. Bảo mật: Local/Internal Only
Để đảm bảo an toàn tuyệt đối, MCP Server lắng nghe cổng `3001` trên tất cả interface (`0.0.0.0:3001`) để cho phép Docker container của goClaw kết nối cục bộ. 

Tuy nhiên, cổng `3001` sẽ hoàn toàn bị chặn truy cập từ Internet bởi tường lửa VPS (UFW). Bạn có thể kiểm tra trạng thái tường lửa:
```bash
sudo ufw status
```
*Lưu ý: Chỉ cho phép các cổng 2018 (SSH), 80 (HTTP), 443 (HTTPS) truy cập từ bên ngoài.*

### 🔗 Kết nối goClaw (Docker) tới MCP:
Đăng ký MCP Server trong bảng điều khiển goClaw (`https://agent.levansy.com`) sử dụng cầu nối mạng Docker trực tiếp thay vì đi qua Nginx:
* **Name:** `herfit`
* **Transport:** `streamable-http`
* **URL:** `http://host.docker.internal:3001/mcp`
* **Tool Prefix:** `herfit_`
