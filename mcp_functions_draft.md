# Danh sách 3 chức năng MCP cho HerFit Telegram Bot

Dưới đây là thiết kế chi tiết cho 3 chức năng MCP hữu ích nhất được chọn để xây dựng cho bot Telegram quản lý dự án HerFit.

---

### 1. Báo cáo doanh thu và đơn hàng (`get_sales_report`)
* **Input params:**
  * `date_range` (string, các giá trị: `"today"`, `"yesterday"`, `"this_week"`, `"this_month"`) - Khoảng thời gian muốn xem báo cáo.
* **Output dự kiến:**
  * Tổng doanh thu thực tế (VNĐ).
  * Số lượng đơn hàng thành công, số lượng đơn hàng đang chờ (`pending`).
  * Danh sách chi tiết các đơn hàng mới nhất (Mã đơn, Tên khách hàng, Số tiền, Trạng thái).
  * Khóa học/sản phẩm bán chạy nhất trong kỳ.
* **Tình huống dùng hàng ngày:** Cuối mỗi ngày hoặc mỗi tuần, bạn chỉ cần gõ yêu cầu trên Telegram để xem nhanh học viện hôm nay thu về bao nhiêu tiền và có bao nhiêu đơn hàng mới.
* **Ví dụ câu nhắn Telegram sẽ trigger:**
  * *"Báo cáo doanh thu hôm nay thế nào"*
  * *"Hôm qua bán được bao nhiêu đơn rồi"*
  * *"Doanh thu tuần này thế nào bot"*
  * *"Xem tổng kết tháng này"*
* **Độ ưu tiên:** 5/5

---

### 2. Xác nhận thanh toán thủ công (`confirm_payment`)
* **Input params:**
  * `order_code` (string) - Mã đơn hàng cần xác nhận (Ví dụ: `DH1234`).
  * `payment_method` (string, tùy chọn, mặc định: `"Manual Transfer"`) - Phương thức thanh toán thủ công.
* **Output dự kiến:**
  * Trạng thái cập nhật đơn hàng thành công/thất bại.
  * Thông tin chi tiết đơn hàng sau cập nhật (Khách hàng, Số tiền).
  * Xác nhận đã gửi email kích hoạt tự động (qua Resend) tới khách hàng hay chưa.
* **Tình huống dùng hàng ngày:** Khi học viên chuyển khoản trực tiếp qua ngân hàng mà quên ghi mã đơn hàng (khiến SePay không tự động đối soát được), bạn có thể duyệt thanh toán ngay trên Telegram để hệ thống gửi email học tập cho họ.
* **Ví dụ câu nhắn Telegram sẽ trigger:**
  * *"Kích hoạt thanh toán đơn DH1024"*
  * *"Xác nhận đơn DH8293 đã chuyển tiền"*
  * *"Duyệt đơn hàng DH9920"*
  * *"Đơn DH3391 học viên chuyển khoản trực tiếp rồi, kích hoạt đi"*
* **Độ ưu tiên:** 5/5

---

### 3. Tra cứu thông tin khách hàng và lịch sử mua hàng (`search_customer`)
* **Input params:**
  * `query` (string) - Tên, số điện thoại hoặc email của khách hàng cần tìm.
* **Output dự kiến:**
  * Danh sách thông tin cá nhân khách hàng khớp (Họ tên, SĐT, Email, Zalo, Ngày đăng ký).
  * Lịch sử tất cả đơn hàng đã mua và trạng thái thanh toán tương ứng của khách hàng đó.
* **Tình huống dùng hàng ngày:** Khi có học viên nhắn tin hỗ trợ trên Zalo hoặc Telegram, bạn có thể nhanh chóng tra cứu xem họ đã đăng ký lớp nào, đóng tiền chưa ngay lập tức mà không cần mở máy tính.
* **Ví dụ câu nhắn Telegram sẽ trigger:**
  * *"Tìm thông tin khách hàng Nguyễn Văn A"*
  * *"Tra cứu số điện thoại 0987873729"*
  * *"Kiểm tra lịch sử mua hàng của email hocvien123@gmail.com"*
  * *"Học viên dùng số zalo 0912345678 đã đăng ký lớp nào chưa"*
* **Độ ưu tiên:** 4/5
