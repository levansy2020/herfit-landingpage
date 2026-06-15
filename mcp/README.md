# Hướng dẫn Deploy HerFit MCP Server

Tài liệu này hướng dẫn cách deploy và chạy dịch vụ HerFit MCP Server sử dụng SQLite và SSE Transport trên VPS Ubuntu.

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

   # Cổng chạy MCP (Mặc định: 3001)
   MCP_PORT=3001

   # Đường dẫn tới file SQLite database dùng chung với website
   SQLITE_DB_PATH=/opt/my-website/brain.db
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
   Description=HerFit MCP Server (SQLite + SSE)
   After=network.target

   [Service]
   Type=simple
   User=root
   WorkingDirectory=/opt/my-website
   ExecStart=/usr/bin/node mcp_server.js
   Restart=on-failure
   Environment=NODE_ENV=production
   Environment=MCP_PORT=3001
   Environment=SQLITE_DB_PATH=/opt/my-website/brain.db

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

## 🛡️ 3. Bảo mật: Localhost Only
MCP Server được cấu hình chỉ lắng nghe trên `127.0.0.1:3001` (localhost) để đảm bảo an toàn. 

Để goClaw (hoặc các bên ngoài) có thể gọi được thông qua kết nối HTTPS an toàn (`https://levansy.com/sse`), hãy thêm cấu hình Reverse Proxy vào file cấu hình Nginx của website (`/etc/nginx/sites-available/levansy.com`):

```nginx
location /sse {
    proxy_pass http://127.0.0.1:3001/sse;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    chunked_transfer_encoding off;
    proxy_buffering off;
    proxy_cache off;
    read_timeout 24h;
}

location /message {
    proxy_pass http://127.0.0.1:3001/message;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Sau khi cấu hình Nginx, restart Nginx để áp dụng:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

Bây giờ goClaw có thể kết nối MCP qua URL: `https://levansy.com/sse`
