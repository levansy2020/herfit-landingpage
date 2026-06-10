from flask import Flask, request, jsonify
import sqlite3

app = Flask(__name__, static_folder='.', static_url_path='')

def get_db_connection():
    conn = sqlite3.connect('brain.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/checkout')
def checkout():
    return app.send_static_file('checkout.html')

@app.route('/admin')
def admin():
    return app.send_static_file('admin.html')

# -- API ENDPOINTS --
@app.route('/api/products', methods=['GET', 'POST'])
def manage_products():
    conn = get_db_connection()
    if request.method == 'GET':
        products = conn.execute('SELECT * FROM products').fetchall()
        conn.close()
        return jsonify([dict(ix) for ix in products])
    else:
        data = request.json
        conn.execute('INSERT INTO products (name, price, description, quantity) VALUES (?, ?, ?, ?)',
                     (data['name'], data['price'], data['description'], data['quantity']))
        conn.commit()
        conn.close()
        return jsonify({'status': 'success'})

@app.route('/api/customers', methods=['GET', 'POST'])
def manage_customers():
    conn = get_db_connection()
    if request.method == 'GET':
        customers = conn.execute('SELECT * FROM customers').fetchall()
        conn.close()
        return jsonify([dict(ix) for ix in customers])
    else:
        data = request.json
        conn.execute('INSERT INTO customers (name, phone, zalo, register_date) VALUES (?, ?, ?, date("now"))',
                     (data['name'], data['phone'], data.get('zalo', '')))
        conn.commit()
        conn.close()
        return jsonify({'status': 'success'})

@app.route('/api/orders', methods=['GET', 'POST'])
def manage_orders():
    conn = get_db_connection()
    if request.method == 'GET':
        orders = conn.execute('''
            SELECT o.order_code, o.amount, o.status, o.order_date, c.name as customer_name, p.name as product_name
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN products p ON o.product_id = p.id
            ORDER BY o.order_date DESC
        ''').fetchall()
        conn.close()
        return jsonify([dict(ix) for ix in orders])

@app.route('/api/orders/update_status', methods=['POST'])
def update_order_status():
    data = request.json
    conn = get_db_connection()
    conn.execute('UPDATE orders SET status = ? WHERE order_code = ?', (data['status'], data['order_code']))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/api/create_order', methods=['POST'])
def create_order():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    # Find or insert customer
    cursor.execute('SELECT id FROM customers WHERE phone = ?', (data['contact'],))
    row = cursor.fetchone()
    if row:
        cust_id = row['id']
    else:
        cursor.execute('INSERT INTO customers (name, phone, register_date) VALUES (?, ?, datetime("now"))', (data['name'], data['contact']))
        cust_id = cursor.lastrowid
        
    # Find product
    cursor.execute('SELECT id FROM products WHERE price = ?', (data['price'],))
    prod_row = cursor.fetchone()
    prod_id = prod_row['id'] if prod_row else None
    
    if prod_id:
        cursor.execute('UPDATE products SET quantity = quantity - 1 WHERE id = ?', (prod_id,))
        
    cursor.execute('INSERT INTO orders (order_code, customer_id, product_id, amount, status, order_date) VALUES (?, ?, ?, ?, ?, datetime("now"))',
                 (data['orderId'], cust_id, prod_id, data['price'], data['status']))
                 
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/api/check_order/<order_code>')
def check_order(order_code):
    conn = get_db_connection()
    row = conn.execute('SELECT status FROM orders WHERE order_code = ?', (order_code,)).fetchone()
    conn.close()
    if row:
        return jsonify({'status': row['status']})
    return jsonify({'status': 'not_found'})

@app.route('/api/sepay_webhook', methods=['POST'])
def sepay_webhook():
    data = request.json
    if not data:
        return jsonify({'status': 'error', 'message': 'No data'}), 400
        
    transfer_amount = data.get('transferAmount', 0)
    content = data.get('content', '')
    
    conn = get_db_connection()
    orders = conn.execute('SELECT * FROM orders WHERE status = "pending"').fetchall()
    
    matched = False
    for order in orders:
        if order['order_code'].upper() in content.upper() and int(transfer_amount) >= int(order['amount']):
            conn.execute('UPDATE orders SET status = "success" WHERE order_code = ?', (order['order_code'],))
            conn.commit()
            matched = True
            break
            
    conn.close()
    return jsonify({'status': 'success', 'matched': matched})

if __name__ == '__main__':
    app.run(port=5000, debug=False)
