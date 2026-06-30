// server/users.js
// API quản lý người dùng + phân quyền (role-based access control)
const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('./db');
const { requireAuth, requireAdmin } = require('./auth');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// ROLES & PERMISSIONS
// ═══════════════════════════════════════════════════════════════
const ROLES = {
  admin: {
    name: 'Quản Lý Tối Cao',
    description: 'Toàn quyền hệ thống',
    permissions: ['*']
  },
  manager: {
    name: 'Quản Lý',
    description: 'Xem tất cả trừ người dùng',
    permissions: [
      'view_dashboard', 'view_banhang', 'view_nvl', 'view_inventory',
      'view_menu', 'view_chamcong', 'view_chiphi', 'view_haohut',
      'view_huyhang', 'view_tonkho', 'view_baocao', 'view_gsheets',
      'edit_banhang', 'edit_inventory', 'edit_chamcong', 'edit_chiphi',
      'edit_haohut', 'edit_huyhang', 'edit_menu', 'edit_tonkho'
    ]
  },
  supervisor: {
    name: 'Giám Sát',
    description: 'Xem tất cả trừ người dùng, menu, công thức',
    permissions: [
      'view_dashboard', 'view_banhang', 'view_nvl', 'view_inventory',
      'view_chamcong', 'view_chiphi', 'view_haohut', 'view_huyhang',
      'view_tonkho', 'view_baocao', 'view_gsheets',
      'edit_banhang', 'edit_inventory', 'edit_chamcong', 'edit_chiphi',
      'edit_haohut', 'edit_huyhang', 'edit_tonkho'
    ]
  },
  staff: {
    name: 'Nhân Viên',
    description: 'Chỉ nhập liệu (nhập hàng, hủy hàng, chấm công)',
    permissions: [
      'view_inventory', 'view_huyhang', 'view_chamcong',
      'edit_inventory', 'edit_huyhang', 'edit_chamcong'
    ]
  }
};

function hasPermission(userRole, permission) {
  const role = ROLES[userRole];
  if (!role) return false;
  if (role.permissions.includes('*')) return true;
  return role.permissions.includes(permission);
}

// ═══════════════════════════════════════════════════════════════
// GET: Danh sách người dùng (chỉ admin)
// ═══════════════════════════════════════════════════════════════
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, name, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST: Tạo người dùng mới (chỉ admin)
// ═══════════════════════════════════════════════════════════════
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { username, name, role, password } = req.body;
  if (!username || !name || !role || !password) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
  }
  if (!ROLES[role]) {
    return res.status(400).json({ error: 'Role không hợp lệ' });
  }
  try {
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Tên tài khoản đã tồn tại' });
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (username, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, name, role, created_at',
      [username, hash, name, role]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// PUT: Cập nhật người dùng (chỉ admin)
// ═══════════════════════════════════════════════════════════════
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, role, password } = req.body;
  try {
    if (role && !ROLES[role]) {
      return res.status(400).json({ error: 'Role không hợp lệ' });
    }
    let query = 'UPDATE users SET updated_at = now()';
    const params = [];
    let paramIndex = 1;
    if (name) {
      query += `, name = $${paramIndex++}`;
      params.push(name);
    }
    if (role) {
      query += `, role = $${paramIndex++}`;
      params.push(role);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      query += `, password_hash = $${paramIndex++}`;
      params.push(hash);
    }
    query += ` WHERE id = $${paramIndex} RETURNING id, username, name, role, created_at`;
    params.push(id);
    const { rows } = await pool.query(query, params);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// DELETE: Xóa người dùng (chỉ admin)
// ═══════════════════════════════════════════════════════════════
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: allUsers } = await pool.query('SELECT COUNT(*)::int as c FROM users');
    if (allUsers[0].c <= 1) {
      return res.status(400).json({ error: 'Không thể xóa người dùng cuối cùng' });
    }
    const { rows } = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }
    res.json({ message: 'Đã xóa người dùng' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET: Thông tin role
// ═══════════════════════════════════════════════════════════════
router.get('/roles/info', (req, res) => {
  res.json(ROLES);
});

module.exports = {
  router,
  hasPermission,
  ROLES
};