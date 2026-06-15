import sqlite3
import urllib.request
import json
import ssl
import os

def load_dotenv(env_path='.env'):
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    os.environ[key.strip()] = val.strip().strip('"').strip("'")

# Load .env files
load_dotenv('.env')
load_dotenv('.env.local')

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://xucsxflvcqqklzakatlt.supabase.co")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_cPC846G2fkf3SoMUNU1JnA_d7RKUCE1")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def post_data(table, data):
    if not data:
        return
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(req, context=ctx) as response:
            print(f"Đã chuyển {len(data)} dòng sang bảng {table}.")
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        if "does not exist" in error_msg:
            print(f"LỖI: Bảng '{table}' chưa được tạo trên Supabase! Bạn cần chạy file schema.sql trước.")
        else:
            print(f"Lỗi khi insert bảng {table}: {e.code} - {error_msg}")

def migrate():
    print("Bắt đầu kết nối SQLite...")
    conn = sqlite3.connect('brain.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Products
    products = [dict(row) for row in cursor.execute('SELECT * FROM products').fetchall()]
    post_data('products', products)
    
    # Customers
    customers = [dict(row) for row in cursor.execute('SELECT * FROM customers').fetchall()]
    post_data('customers', customers)
    
    # Orders
    orders = [dict(row) for row in cursor.execute('SELECT * FROM orders').fetchall()]
    post_data('orders', orders)
    
    print("Hoàn tất!")

if __name__ == "__main__":
    migrate()
