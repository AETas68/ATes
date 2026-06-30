// server/index.js
require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const { pool, initSchema } = require('./db');
const { router: authRouter } = require('./auth');
const usersRouter = require('./users');
const stateRouterFactory = require('./state');

const SECRET = process.env.JWT_SECRET || 'doi-secret-nay-trong-file-.env';
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json({ limit: '15mb' })); // du lieu S co the kha lon (menu + ban hang nhieu thang)

// ------------------- API -------------------
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/state', stateRouterFactory(io));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ------------------- SOCKET.IO: xac thuc bang JWT -------------------
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Chưa đăng nhập'));
  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return next(new Error('Phiên đăng nhập hết hạn'));
    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`🔌 ${socket.user?.name || 'unknown'} đã kết nối (${socket.id})`);
  socket.on('disconnect', () => {
    console.log(`🔌 ${socket.user?.name || 'unknown'} đã ngắt kết nối`);
  });
});

// ------------------- FRONTEND TINH (static) -------------------
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ------------------- KHOI DONG -------------------
// Thêm logging chi tiết hơn khi khởi tạo database để dễ debug
initSchema()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 KhạpKhun server đang chạy tại http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    // In toàn bộ lỗi (stack) để biết nguyên nhân
    console.error('❌ Lỗi khởi tạo database:', err);
    process.exit(1);
  });

// Bắt lỗi server listen hoặc lỗi runtime
server.on('error', (err) => {
  console.error('❌ Lỗi server:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});
