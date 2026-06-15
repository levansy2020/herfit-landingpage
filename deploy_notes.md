# Hướng dẫn Deploy hệ thống HerFit Landing Page (Next.js) trên VPS Ubuntu

Hệ thống được cấu hình chạy bằng framework **Next.js** ở môi trường Production, kết nối cơ sở dữ liệu **Supabase** (cho lưu trữ và đối soát) và **Resend** (để gửi email chăm sóc/thanh toán thành công).

---

## 1. Các biến môi trường (.env) cần có trên VPS
Tạo file `.env` tại thư mục gốc của dự án trên VPS với các nội dung sau:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xucsxflvcqqklzakatlt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_cPC846G2fkf3SoMUNU1JnA_d7RKUCE1

# Resend Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=Lê Văn Sỹ <hi@levansy.com>

# Payment Bank Configuration (VietQR/Sepay)
NEXT_PUBLIC_BANK_NAME=MBBank
NEXT_PUBLIC_BANK_ACC=0987873729
NEXT_PUBLIC_BANK_HOLDER=LE VAN SY

# Port cấu hình chạy ứng dụng
PORT=3000
```

---

## 2. Cổng (Port) lắng nghe của Server
* Mặc định Next.js sẽ lắng nghe cổng **3000** (hoặc cổng bất kỳ được định nghĩa qua biến môi trường `PORT` trên VPS).
* Nếu chạy qua lệnh, cổng sẽ tự động lấy từ `process.env.PORT`.

---

## 3. Lệnh cài đặt và chạy Server trên VPS Ubuntu

### Bước 1: Cài đặt Node.js (nếu VPS chưa có)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Bước 2: Cài đặt các thư viện (dependencies)
```bash
npm install
```

### Bước 3: Build dự án
```bash
npm run build
```

### Bước 4: Chạy server ở chế độ Production

**Cách 1: Chạy trực tiếp (để test)**
```bash
PORT=3000 npm run start
```

**Cách 2: Chạy chạy ngầm bằng PM2 (Khuyên dùng cho Production)**
Cài đặt PM2 để giữ server chạy liên tục khi tắt terminal:
```bash
sudo npm install -g pm2
pm2 start npm --name "herfit-landingpage" -- start -- -p 3000
```

Để cấu hình PM2 tự khởi động cùng VPS khi reboot:
```bash
pm2 startup
pm2 save
```
