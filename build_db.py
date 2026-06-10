import sqlite3
import json
import os
from datetime import datetime

DB_PATH = "brain.db"
WAITLIST_PATH = "waitlist.json"

def build_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # (1) Bảng products
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            description TEXT,
            quantity INTEGER NOT NULL
        )
    """)

    # (2) Bảng customers
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            zalo TEXT,
            register_date TEXT,
            UNIQUE(phone)
        )
    """)

    # (3) Bảng orders
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            order_code TEXT PRIMARY KEY,
            customer_id INTEGER,
            product_id INTEGER,
            amount INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            order_date TEXT,
            FOREIGN KEY(customer_id) REFERENCES customers(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    """)

    # Insert products if empty
    cursor.execute("SELECT COUNT(*) FROM products")
    if cursor.fetchone()[0] == 0:
        products = [
            ("Sản phẩm Test", 2000, "Dùng để test giao dịch 2.000đ", 1000),
            ("Ebook: Bí quyết tư vấn chốt sale PT", 299000, "Cẩm nang chốt khách không ép sale", 100),
            ("Khóa học HerFit Trainer K1", 7500000, "Học bổng 50% chỉ còn 7.500.000", 10)
        ]
        cursor.executemany("INSERT INTO products (name, price, description, quantity) VALUES (?, ?, ?, ?)", products)

    # Import waitlist
    if os.path.exists(WAITLIST_PATH):
        with open(WAITLIST_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for row in data:
                try:
                    cursor.execute("INSERT OR IGNORE INTO customers (name, phone, zalo, register_date) VALUES (?, ?, ?, ?)", 
                                   (row.get('name', ''), row.get('phone', ''), row.get('zalo', ''), datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
                except Exception as e:
                    pass

    conn.commit()
    
    print("--- DATA SUMMARY ---")
    for table in ['products', 'customers', 'orders']:
        cursor.execute(f"SELECT * FROM {table}")
        rows = cursor.fetchall()
        print(f"Bảng {table} có {len(rows)} dòng:")
        for r in rows:
            print("  -", r)
    print("--------------------")

    conn.close()

if __name__ == "__main__":
    build_db()
