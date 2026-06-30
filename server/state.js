// server/state.js
// API quản lý app state (lưu/tải dữ liệu) với kiểm soát quyền
const express = require('express');
const { pool } = require('./db');
const { requireAuth } = require('./auth');
const { hasPermission } = require('./users');

function stateRouterFactory(io) {
  const router = express.Router();

  // ═══════════════════════════════════════════════════════════════
  // GET: Lấy dữ liệu app state (toàn bộ)
  // ═══════════════════════════════════════════════════════════════
  router.get('/', requireAuth, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT data FROM app_state WHERE id = 1');
      if (rows.length === 0) {
        return res.json({});
      }
      
      const fullState = rows[0].data;
      const filteredState = filterStateByRole(fullState, req.user.role);
      res.json(filteredState);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // GET: Lấy một phần dữ liệu cụ thể
  // ═══════════════════════════════════════════════════════════════
  router.get('/:section', requireAuth, async (req, res) => {
    const { section } = req.params;
    const permission = `view_${section}`;
    
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: 'Không có quyền xem' });
    }
    
    try {
      const { rows } = await pool.query('SELECT data FROM app_state WHERE id = 1');
      if (rows.length === 0 || !rows[0].data[section]) {
        return res.json({});
      }
      res.json(rows[0].data[section]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // POST: Lưu toàn bộ state
  // ═══════════════════════════════════════════════════════════════
  router.post('/', requireAuth, async (req, res) => {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Thiếu dữ liệu' });
    }
    
    // Kiểm tra quyền sửa từng section
    for (const section in data) {
      const editPermission = `edit_${section}`;
      if (!hasPermission(req.user.role, editPermission)) {
        return res.status(403).json({ error: `Không có quyền sửa ${section}` });
      }
    }
    
    try {
      const now = new Date().toISOString();
      const { rows: oldRows } = await pool.query('SELECT data FROM app_state WHERE id = 1');
      const oldState = oldRows[0]?.data || {};
      const newState = { ...oldState, ...data };
      
      // Auto-sync: Cập nhật tồn kho từ nhập hàng
      if (data.inventory) {
        newState.tonkho = autoCalcTonKho(data.inventory, oldState.tonkho || {});
      }
      
      await pool.query(
        'UPDATE app_state SET data = $1, updated_at = $2, updated_by = $3 WHERE id = 1',
        [JSON.stringify(newState), now, req.user.username]
      );
      
      if (io) {
        io.emit('state_updated', { updatedAt: now, updatedBy: req.user.name, sections: Object.keys(data) });
      }
      
      res.json({ message: 'Đã lưu dữ liệu', updatedAt: now });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // PATCH: Cập nhật một phần dữ liệu
  // ═══════════════════════════════════════════════════════════════
  router.patch('/:section', requireAuth, async (req, res) => {
    const { section } = req.params;
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: 'Thiếu dữ liệu' });
    }
    
    const editPermission = `edit_${section}`;
    if (!hasPermission(req.user.role, editPermission)) {
      return res.status(403).json({ error: `Không có quyền sửa ${section}` });
    }
    
    try {
      const now = new Date().toISOString();
      const { rows } = await pool.query('SELECT data FROM app_state WHERE id = 1');
      const currentState = rows[0]?.data || {};
      const sectionData = currentState[section] || {};
      const updatedSection = { ...sectionData, ...data };
      const newState = { ...currentState, [section]: updatedSection };
      
      // Auto-sync
      if (section === 'inventory') {
        newState.tonkho = autoCalcTonKho(updatedSection, newState.tonkho || {});
      }
      
      await pool.query(
        'UPDATE app_state SET data = $1, updated_at = $2, updated_by = $3 WHERE id = 1',
        [JSON.stringify(newState), now, req.user.username]
      );
      
      if (io) {
        io.emit('state_updated', { updatedAt: now, updatedBy: req.user.name, sections: [section] });
      }
      
      res.json({ message: `Đã cập nhật ${section}`, updatedAt: now });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Lọc state theo role
// ═══════════════════════════════════════════════════════════════
function filterStateByRole(state, role) {
  const filtered = { ...state };
  
  if (role === 'admin') return filtered;
  if (role === 'manager') {
    delete filtered.users;
    return filtered;
  }
  if (role === 'supervisor') {
    delete filtered.users;
    delete filtered.menu;
    return filtered;
  }
  if (role === 'staff') {
    return {
      inventory: filtered.inventory || {},
      huyhang: filtered.huyhang || {},
      chamcong: filtered.chamcong || {},
      nvl: filtered.nvl || {}
    };
  }
  return {};
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Tự động tính tồn kho từ nhập hàng
// ═══════════════════════════════════════════════════════════════
function autoCalcTonKho(inventory, currentTonkho) {
  const tonkho = { ...currentTonkho };
  
  if (Array.isArray(inventory)) {
    inventory.forEach(inv => {
      const key = inv.ten || '';
      if (!key) return;
      
      if (!tonkho[key]) {
        tonkho[key] = { sl: 0, gia: 0 };
      }
      
      const tonCu = tonkho[key].sl || 0;
      const nhapThang = inventory.filter(i => i.ten === key).reduce((sum, i) => sum + (i.so_luong || 0), 0);
      tonkho[key].sl = Math.max(0, tonCu + nhapThang);
      tonkho[key].gia = inv.don_gia || tonkho[key].gia;
    });
  }
  
  return tonkho;
}

module.exports = stateRouterFactory;