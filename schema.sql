-- Chạy toàn bộ đoạn code này trong mục SQL Editor của Supabase

-- Xóa các bảng cũ nếu có (cẩn thận nếu đã có data quan trọng)
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;

-- 1. Bảng products
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL
);

-- 2. Bảng customers
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    zalo TEXT,
    register_date TIMESTAMP DEFAULT NOW()
);

-- 3. Bảng orders
CREATE TABLE orders (
    order_code TEXT PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    product_id INTEGER REFERENCES products(id),
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    order_date TIMESTAMP DEFAULT NOW()
);

-- Cấp quyền ẩn danh (Anon) có thể Đọc/Ghi qua API (Mặc định cho dự án demo)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public insert products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update products" ON products FOR UPDATE USING (true);

CREATE POLICY "Allow public read customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Allow public insert customers" ON customers FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update orders" ON orders FOR UPDATE USING (true);
