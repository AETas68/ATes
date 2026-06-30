// server/state.js
const express = require('express');
const { pool } = require('./db');
const { requireAuth } = require('./auth');

module.exports = function (io) {
  const router = express.Router();

  // Lay toan bo du lieu (S object) hien dang luu tren server
  router.get('/', requireAuth, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT data, updated_at, updated_by FROM app_state WHERE id = 1');
      res.json(rows[0] || { data: {}, updated_at: null, updated_by: null });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Luu toan bo du lieu, roi bao cho cac thiet bi khac dang mo app biet de cap nhat
  router.put('/', requireAuth, async (req, res) => {
    const { data } = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
    }
    try {
      const { rows } = await pool.query(
        `UPDATE app_state SET data = $1, updated_at = now(), updated_by = $2
         WHERE id = 1 RETURNING updated_at`,
        [JSON.stringify(data), req.user.name]
      );
      const updated_at = rows[0].updated_at;

      // Bao cho tat ca thiet bi khac (tru thiet bi vua luu) de tu dong cap nhat man hinh
      const senderSocketId = req.headers['x-socket-id'];
      io.sockets.sockets.forEach((s) => {
        if (s.id !== senderSocketId) {
          s.emit('state-updated', { data, updated_at, updated_by: req.user.name });
        }
      });

      res.json({ updated_at, updated_by: req.user.name });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
