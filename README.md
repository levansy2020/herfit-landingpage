# Hướng dẫn Deploy hệ thống HerFit Landing Page

Dự án này là hệ thống landing page kết hợp Backend serverless dùng Next.js, tích hợp CRM Supabase, và tự động hóa email qua Resend.

## 1. Yêu cầu môi trường
- Node.js >= 18
- Tài khoản Supabase (để quản lý Database)
- Tài khoản Resend (để gửi Email tự động)
- Tài khoản Vercel (để Deploy)

## 2. Các biến môi trường cần thiết (Environment Variables)
Khi deploy lên Vercel, bạn CẦN PHẢI khai báo các biến môi trường sau trong tab **Settings > Environment Variables**:

- `NEXT_PUBLIC_SUPABASE_URL`: Đường dẫn API Supabase của dự án.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: API Key (mức public) của Supabase.
- `RESEND_API_KEY`: API Key của Resend.

*(Tuyệt đối không lưu trực tiếp các key này vào mã nguồn)*

## 3. Các bước Deploy lên Vercel
1. Đẩy (Push) toàn bộ code này lên một repository trên Github.
2. Đăng nhập vào Vercel (vercel.com), chọn **Add New Project**.
3. Kết nối với tài khoản Github và chọn Repository vừa tạo.
4. Ở phần **Environment Variables**, điền đầy đủ 3 biến môi trường đã nêu ở mục 2.
5. Bấm **Deploy**.
6. Chờ khoảng 1-2 phút, khi màn hình báo **Ready** là hệ thống đã Go-Live.

## 4. Tích hợp thanh toán tự động (Sepay)
- Cấu hình Webhook trên Sepay trỏ về: `https://[tên-miền-của-bạn]/api/sepay_webhook`.
- Đảm bảo định dạng nội dung chuyển khoản khớp với `Mã Đơn Hàng` (Ví dụ: `HF001`). Khi đó hệ thống sẽ tự động đối soát và gửi email.

Chúc bạn kinh doanh thành công!
