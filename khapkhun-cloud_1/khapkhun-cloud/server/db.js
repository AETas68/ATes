// server/db.js
// Ket noi PostgreSQL + khoi tao bang du lieu (chay tu dong khi server khoi dong)
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Nếu DATABASE_URL tồn tại và chứa 'localhost' -> không dùng SSL (local dev)
  // Nếu DATABASE_URL tồn tại nhưng không là localhost (ví dụ: Heroku) -> bật SSL với rejectUnauthorized:false
  // Nếu DATABASE_URL không được cung cấp -> không bật SSL (false)
  ssl: process.env.DATABASE_URL
    ? (process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false })
    : false
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now(),
      updated_by TEXT,
      CONSTRAINT single_row CHECK (id = 1)
    );
  `);

  // Seed tai khoan quan ly dau tien neu chua co user nao
  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM users');
  if (rows[0].c === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, password_hash, name, role) VALUES ($1,$2,$3,$4)',
      [username, hash, 'Quản lý', 'admin']
    );
    console.log(`✅ Đã tạo tài khoản quản lý đầu tiên — username: "${username}" / password: "${password}"`);
    console.log('⚠️  Hãy đổi mật khẩu này sau khi đăng nhập lần đầu (mục Người Dùng)!');
  }

  // Seed app_state rong neu chua co
  const stateRes = await pool.query('SELECT id FROM app_state WHERE id = 1');
  if (stateRes.rows.length === 0) {
    await pool.query(
      'INSERT INTO app_state (id, data, updated_by) VALUES (1, $1, $2)',
      [JSON.stringify({}), 'system']
    );
  }
}

module.exports = { pool, initSchema };