require('dotenv').config();
const { Pool } = require('pg');

(async () => {
  const connectionString = process.env.DATABASE_URL || null;
  const pool = new Pool({ connectionString });
  try {
    const r = await pool.query('SELECT now()');
    console.log('DB OK:', r.rows[0]);
  } catch (e) {
    console.error('DB ERROR:', e);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
