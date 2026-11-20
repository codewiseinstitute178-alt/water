const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new Database(path.join(__dirname, 'water.db'));
db.pragma('journal_mode = WAL');

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      email TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT,
      phone TEXT,
      salary REAL DEFAULT 0,
      hire_date TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS water_tankers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanker_number TEXT NOT NULL,
      capacity REAL DEFAULT 0,
      status TEXT DEFAULT 'available',
      driver_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (driver_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      tanker_id INTEGER,
      employee_id INTEGER,
      quantity REAL DEFAULT 0,
      unit TEXT DEFAULT 'liters',
      order_date TEXT DEFAULT CURRENT_TIMESTAMP,
      delivery_date TEXT,
      status TEXT DEFAULT 'pending',
      total_amount REAL DEFAULT 0,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (tanker_id) REFERENCES water_tankers(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      amount REAL DEFAULT 0,
      payment_date TEXT DEFAULT CURRENT_TIMESTAMP,
      method TEXT,
      status TEXT DEFAULT 'paid',
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT,
      amount REAL DEFAULT 0,
      expense_date TEXT DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      quantity REAL DEFAULT 0,
      unit TEXT DEFAULT 'units',
      reorder_level REAL DEFAULT 0,
      last_updated TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
initDB();

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/customers', (req, res) => {
  res.json(db.prepare('SELECT * FROM customers ORDER BY id DESC').all());
});
app.post('/api/customers', (req, res) => {
  const { name, phone, address, email } = req.body;
  const info = db.prepare('INSERT INTO customers (name, phone, address, email) VALUES (?, ?, ?, ?)').run(name, phone, address, email);
  res.json({ id: info.lastInsertRowid, name, phone, address, email });
});
app.put('/api/customers/:id', (req, res) => {
  const { name, phone, address, email } = req.body;
  db.prepare('UPDATE customers SET name=?, phone=?, address=?, email=? WHERE id=?').run(name, phone, address, email, req.params.id);
  res.json({ id: req.params.id, name, phone, address, email });
});
app.delete('/api/customers/:id', (req, res) => {
  db.prepare('DELETE FROM customers WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/employees', (req, res) => {
  res.json(db.prepare('SELECT * FROM employees ORDER BY id DESC').all());
});
app.post('/api/employees', (req, res) => {
  const { name, role, phone, salary, hire_date, status } = req.body;
  const info = db.prepare('INSERT INTO employees (name, role, phone, salary, hire_date, status) VALUES (?, ?, ?, ?, ?, ?)').run(name, role, phone, salary, hire_date, status);
  res.json({ id: info.lastInsertRowid, name, role, phone, salary, hire_date, status });
});
app.put('/api/employees/:id', (req, res) => {
  const { name, role, phone, salary, hire_date, status } = req.body;
  db.prepare('UPDATE employees SET name=?, role=?, phone=?, salary=?, hire_date=?, status=? WHERE id=?').run(name, role, phone, salary, hire_date, status, req.params.id);
  res.json({ id: req.params.id, name, role, phone, salary, hire_date, status });
});
app.delete('/api/employees/:id', (req, res) => {
  db.prepare('DELETE FROM employees WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/tankers', (req, res) => {
  const rows = db.prepare(`SELECT t.*, e.name AS driver_name FROM water_tankers t LEFT JOIN employees e ON t.driver_id = e.id ORDER BY t.id DESC`).all();
  res.json(rows);
});
app.post('/api/tankers', (req, res) => {
  const { tanker_number, capacity, status, driver_id } = req.body;
  const info = db.prepare('INSERT INTO water_tankers (tanker_number, capacity, status, driver_id) VALUES (?, ?, ?, ?)').run(tanker_number, capacity, status, driver_id);
  res.json({ id: info.lastInsertRowid, tanker_number, capacity, status, driver_id });
});
app.put('/api/tankers/:id', (req, res) => {
  const { tanker_number, capacity, status, driver_id } = req.body;
  db.prepare('UPDATE water_tankers SET tanker_number=?, capacity=?, status=?, driver_id=? WHERE id=?').run(tanker_number, capacity, status, driver_id, req.params.id);
  res.json({ id: req.params.id, tanker_number, capacity, status, driver_id });
});
app.delete('/api/tankers/:id', (req, res) => {
  db.prepare('DELETE FROM water_tankers WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/orders', (req, res) => {
  const rows = db.prepare(`SELECT o.*, c.name AS customer_name, t.tanker_number, e.name AS employee_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id LEFT JOIN water_tankers t ON o.tanker_id = t.id LEFT JOIN employees e ON o.employee_id = e.id ORDER BY o.id DESC`).all();
  res.json(rows);
});
app.post('/api/orders', (req, res) => {
  const { customer_id, tanker_id, employee_id, quantity, unit, order_date, delivery_date, status, total_amount } = req.body;
  const info = db.prepare('INSERT INTO orders (customer_id, tanker_id, employee_id, quantity, unit, order_date, delivery_date, status, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(customer_id, tanker_id, employee_id, quantity, unit, order_date, delivery_date, status, total_amount);
  res.json({ id: info.lastInsertRowid, customer_id, tanker_id, employee_id, quantity, unit, order_date, delivery_date, status, total_amount });
});
app.put('/api/orders/:id', (req, res) => {
  const { customer_id, tanker_id, employee_id, quantity, unit, order_date, delivery_date, status, total_amount } = req.body;
  db.prepare('UPDATE orders SET customer_id=?, tanker_id=?, employee_id=?, quantity=?, unit=?, order_date=?, delivery_date=?, status=?, total_amount=? WHERE id=?').run(customer_id, tanker_id, employee_id, quantity, unit, order_date, delivery_date, status, total_amount, req.params.id);
  res.json({ id: req.params.id, customer_id, tanker_id, employee_id, quantity, unit, order_date, delivery_date, status, total_amount });
});
app.delete('/api/orders/:id', (req, res) => {
  db.prepare('DELETE FROM orders WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/payments', (req, res) => {
  const rows = db.prepare(`SELECT p.*, o.total_amount, c.name AS customer_name FROM payments p LEFT JOIN orders o ON p.order_id = o.id LEFT JOIN customers c ON o.customer_id = c.id ORDER BY p.id DESC`).all();
  res.json(rows);
});
app.post('/api/payments', (req, res) => {
  const { order_id, amount, payment_date, method, status } = req.body;
  const info = db.prepare('INSERT INTO payments (order_id, amount, payment_date, method, status) VALUES (?, ?, ?, ?, ?)').run(order_id, amount, payment_date, method, status);
  res.json({ id: info.lastInsertRowid, order_id, amount, payment_date, method, status });
});
app.put('/api/payments/:id', (req, res) => {
  const { order_id, amount, payment_date, method, status } = req.body;
  db.prepare('UPDATE payments SET order_id=?, amount=?, payment_date=?, method=?, status=? WHERE id=?').run(order_id, amount, payment_date, method, status, req.params.id);
  res.json({ id: req.params.id, order_id, amount, payment_date, method, status });
});
app.delete('/api/payments/:id', (req, res) => {
  db.prepare('DELETE FROM payments WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/expenses', (req, res) => {
  res.json(db.prepare('SELECT * FROM expenses ORDER BY id DESC').all());
});
app.post('/api/expenses', (req, res) => {
  const { category, amount, expense_date, description } = req.body;
  const info = db.prepare('INSERT INTO expenses (category, amount, expense_date, description) VALUES (?, ?, ?, ?)').run(category, amount, expense_date, description);
  res.json({ id: info.lastInsertRowid, category, amount, expense_date, description });
});
app.put('/api/expenses/:id', (req, res) => {
  const { category, amount, expense_date, description } = req.body;
  db.prepare('UPDATE expenses SET category=?, amount=?, expense_date=?, description=? WHERE id=?').run(category, amount, expense_date, description, req.params.id);
  res.json({ id: req.params.id, category, amount, expense_date, description });
});
app.delete('/api/expenses/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/stock', (req, res) => {
  res.json(db.prepare('SELECT * FROM stock ORDER BY id DESC').all());
});
app.post('/api/stock', (req, res) => {
  const { item_name, quantity, unit, reorder_level } = req.body;
  const info = db.prepare('INSERT INTO stock (item_name, quantity, unit, reorder_level) VALUES (?, ?, ?, ?)').run(item_name, quantity, unit, reorder_level);
  res.json({ id: info.lastInsertRowid, item_name, quantity, unit, reorder_level });
});
app.put('/api/stock/:id', (req, res) => {
  const { item_name, quantity, unit, reorder_level } = req.body;
  db.prepare('UPDATE stock SET item_name=?, quantity=?, unit=?, reorder_level=? WHERE id=?').run(item_name, quantity, unit, reorder_level, req.params.id);
  res.json({ id: req.params.id, item_name, quantity, unit, reorder_level });
});
app.delete('/api/stock/:id', (req, res) => {
  db.prepare('DELETE FROM stock WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/reports/dashboard', (req, res) => {
  const totalCustomers = db.prepare('SELECT COUNT(*) AS c FROM customers').get().c;
  const totalEmployees = db.prepare('SELECT COUNT(*) AS c FROM employees').get().c;
  const totalTankers = db.prepare('SELECT COUNT(*) AS c FROM water_tankers').get().c;
  const totalOrders = db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
  const pendingOrders = db.prepare("SELECT COUNT(*) AS c FROM orders WHERE status='pending'").get().c;
  const totalRevenue = db.prepare('SELECT COALESCE(SUM(total_amount),0) AS s FROM orders').get().s;
  const totalExpenses = db.prepare('SELECT COALESCE(SUM(amount),0) AS s FROM expenses').get().s;
  const totalPaid = db.prepare("SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE status='paid'").get().s;
  res.json({ totalCustomers, totalEmployees, totalTankers, totalOrders, pendingOrders, totalRevenue, totalExpenses, totalPaid, profit: totalRevenue - totalExpenses });
});

app.get('/api/reports/monthly', (req, res) => {
  const rows = db.prepare(`SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) AS orders, COALESCE(SUM(total_amount),0) AS revenue FROM orders GROUP BY month ORDER BY month DESC LIMIT 12`).all();
  res.json(rows);
});

app.get('/api/reports/yearly', (req, res) => {
  const rows = db.prepare(`SELECT strftime('%Y', order_date) AS year, COUNT(*) AS orders, COALESCE(SUM(total_amount),0) AS revenue FROM orders GROUP BY year ORDER BY year DESC`).all();
  res.json(rows);
});

app.get('/api/reports/daily', (req, res) => {
  const rows = db.prepare(`SELECT date(order_date) AS day, COUNT(*) AS orders, COALESCE(SUM(total_amount),0) AS revenue FROM orders GROUP BY day ORDER BY day DESC LIMIT 30`).all();
  res.json(rows);
});

app.listen(PORT, () => console.log(`Water Supply Management System running on http://localhost:${PORT}`));
