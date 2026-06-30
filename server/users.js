// server/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('./db');
const { requireAuth, requireAdmin } = require('./auth');

const router = express.Router();

// Danh sach nguoi dung (khong tra ve mat khau)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, username, name, role, created_at FROM users ORDER BY id ASC'
  );
  res.json(rows);
});

// Them nguoi dung moi
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Thiếu thông tin' });
  }
  if (!['admin', 'staff', 'bep', 'phucvu', 'thungan'].includes(role)) {
    return res.status(400).json({ error: 'Vai trò không hợp lệ' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (username, password_hash, name, role) VALUES ($1,$2,$3,$4) RETURNING id, username, name, role',
      [username.trim(), hash, name.trim(), role]
    );
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Tài khoản này đã tồn tại' });
    res.status(500).json({ error: e.message });
  }
});

// Cap nhat (doi ten / vai tro / reset mat khau)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, role, password } = req.body;
  try {
    if (name) await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name, id]);
    if (role && ['admin', 'staff', 'bep', 'phucvu', 'thungan'].includes(role)) {
      await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);
    }
    res.json({ message: 'Đã cập nhật' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Xoa nguoi dung
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (parseInt(id, 10) === req.user.id) {
    return res.status(400).json({ error: 'Không thể tự xoá chính mình' });
  }
  try {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM users WHERE role = 'admin'");
    const target = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (target.rows[0]?.role === 'admin' && rows[0].c <= 1) {
      return res.status(400).json({ error: 'Phải có ít nhất 1 tài khoản Quản lý' });
    }
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'Đã xoá' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
