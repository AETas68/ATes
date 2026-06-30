# 🍜 KhạpKhun Cloud — Bản nhiều người dùng

Đây là app **KhạpKhun** gốc của bạn, được nâng cấp để:
- ✅ Nhiều người **đăng nhập cùng lúc** từ nhiều thiết bị/nơi khác nhau qua Internet
- ✅ Dữ liệu lưu **chung trên 1 server**, không còn lưu riêng từng máy (localStorage) nữa
- ✅ **Tự động đồng bộ real-time**: ai lưu dữ liệu, các máy khác đang mở app sẽ thấy cập nhật gần như ngay lập tức
- ✅ Có **đăng nhập + phân quyền** (Quản lý / Nhân viên), Quản lý có thể tạo/xoá tài khoản nhân viên

Toàn bộ giao diện, công thức, cách tính giá vốn, hao hụt, báo cáo... **giữ nguyên 100%** như bản bạn đang dùng — chỉ phần "lưu dữ liệu" là được thay đổi.

---

## 1. Cấu trúc project

```
khapkhun-cloud/
├── package.json
├── .env.example        ← copy thành .env khi chạy ở máy local
├── server/
│   ├── index.js         ← server chính (Express + Socket.io)
│   ├── db.js             ← kết nối PostgreSQL, tự tạo bảng khi khởi động
│   ├── auth.js            ← đăng nhập, đổi mật khẩu
│   ├── users.js            ← quản lý tài khoản (chỉ Quản lý)
│   └── state.js             ← lưu/tải dữ liệu app + đồng bộ real-time
└── public/
    └── index.html         ← toàn bộ giao diện app (file gốc của bạn + phần đăng nhập/đồng bộ)
```

---

## 2. Deploy miễn phí lên Internet (khuyên dùng: Neon + Render)

### Bước 1 — Tạo Database PostgreSQL miễn phí trên Neon
1. Vào **https://neon.tech** → Đăng ký tài khoản miễn phí (không cần thẻ tín dụng)
2. Tạo 1 Project mới → Neon tự tạo sẵn 1 database
3. Vào **Connection Details**, copy chuỗi **Connection string** (dạng `postgres://user:pass@host/dbname?sslmode=require`) — đây chính là `DATABASE_URL` bạn sẽ dùng ở bước sau

### Bước 2 — Đưa code lên GitHub
1. Tạo 1 repository mới trên **https://github.com** (có thể để Private)
2. Upload toàn bộ thư mục `khapkhun-cloud` này lên repo đó
   (Cách dễ nhất nếu không quen Git: vào trang repo → "Add file" → "Upload files" → kéo thả toàn bộ các file/folder vào)

### Bước 3 — Deploy lên Render
1. Vào **https://render.com** → Đăng ký miễn phí, đăng nhập bằng GitHub
2. Bấm **New** → **Web Service** → chọn repo vừa tạo ở Bước 2
3. Điền cấu hình:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Vào mục **Environment** → thêm các biến môi trường:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | (chuỗi connection string lấy từ Neon ở Bước 1) |
   | `JWT_SECRET` | một chuỗi bí mật bất kỳ, càng dài càng tốt, ví dụ: `khapkhun-2026-bi-mat-xyz789` |
   | `ADMIN_USERNAME` | `admin` (hoặc tên bạn muốn) |
   | `ADMIN_PASSWORD` | mật khẩu Quản lý đầu tiên, ví dụ: `MatKhauManh123` |
5. Bấm **Create Web Service** — Render sẽ tự build và chạy. Sau ~2-3 phút, bạn sẽ có 1 đường link dạng `https://khapkhun-xxxx.onrender.com`
6. Mở link đó → đăng nhập bằng `ADMIN_USERNAME` / `ADMIN_PASSWORD` vừa đặt → vào app như bình thường

> ⚠️ **Lưu ý gói Free của Render**: nếu không có ai truy cập trong ~15 phút, server sẽ "ngủ" và lần mở tiếp theo sẽ mất khoảng 30-50 giây để "thức dậy". Dữ liệu **không bị mất** khi server ngủ — Postgres trên Neon vẫn lưu trữ độc lập 24/7. Nếu cần server luôn sẵn sàng (không có độ trễ thức dậy), bạn có thể nâng cấp gói trả phí của Render sau (~7 USD/tháng).

### Bước 4 — Tạo tài khoản cho nhân viên
1. Đăng nhập bằng tài khoản Quản lý
2. Vào tab **👤 Người Dùng** (chỉ Quản lý mới thấy tab này)
3. Bấm **+ Thêm Người Dùng** → nhập tên, tài khoản, mật khẩu, chọn vai trò (Nhân viên hoặc Quản lý)
4. Gửi tài khoản/mật khẩu đó cho nhân viên — họ vào cùng link Render để đăng nhập từ điện thoại/máy tính của họ

---

## 3. Chạy thử ở máy tính cá nhân (trước khi deploy, không bắt buộc)

Cần cài sẵn **Node.js** (https://nodejs.org) và 1 database PostgreSQL (có thể dùng luôn Neon ở Bước 1, không cần cài Postgres ở máy).

```bash
cd khapkhun-cloud
npm install
cp .env.example .env
# Mở file .env, điền DATABASE_URL / JWT_SECRET / ADMIN_USERNAME / ADMIN_PASSWORD
npm start
```

Sau đó mở trình duyệt vào `http://localhost:3000`.

---

## 4. Vai trò & phân quyền

| | Quản lý (admin) | Nhân viên (staff) |
|---|---|---|
| Dùng toàn bộ các tab nghiệp vụ (Bán Hàng, NVL, Menu, Kho, Chấm Công, Chi Phí, Báo Cáo...) | ✅ | ✅ |
| Xem/thêm/xoá tài khoản người dùng | ✅ | ❌ (không thấy tab Người Dùng) |
| Đổi mật khẩu của chính mình | ✅ | ✅ |

> App KhạpKhun gốc không có khái niệm phân quyền theo từng chức năng cụ thể (vì đây vốn là công cụ nội bộ 1 người dùng), nên bản nâng cấp này chỉ phân quyền ở mức "ai được quản lý tài khoản người dùng". Nếu sau này bạn cần giới hạn sâu hơn (ví dụ: Nhân viên không được xem Báo Cáo / Chi Phí), nhắn lại để bổ sung.

---

## 5. Cách hoạt động đồng bộ nhiều người dùng

- Toàn bộ dữ liệu (NVL, Menu, Bán hàng, Kho, Chấm công, Chi phí, Báo cáo...) được lưu **chung 1 nơi** trên database server, không còn lưu riêng theo từng trình duyệt.
- Khi 1 người bấm **💾 Lưu** (hoặc hệ thống tự lưu sau mỗi 2 phút), dữ liệu được đẩy lên server, rồi server **báo ngay cho tất cả thiết bị khác đang mở app** để tự cập nhật màn hình — không cần bấm F5.
- Mỗi thiết bị vẫn giữ 1 **bản sao lưu tạm trên máy** (`localStorage`) để phòng trường hợp mất mạng tạm thời — chấm tròn 🟢/🔴 ở góc phải thanh menu cho biết tình trạng kết nối server.
- Vì dữ liệu dùng chung, nếu 2 người cùng sửa **đúng cùng 1 mục** trong vòng vài giây, người lưu sau sẽ ghi đè người lưu trước (giống Google Sheets khi 2 người gõ cùng 1 ô cùng lúc). Với quy mô vài nhân viên thao tác không liên tục như quán ăn, trường hợp này hiếm khi xảy ra; nếu cần khoá chỉnh sửa theo từng mục để tránh hoàn toàn việc ghi đè, có thể nâng cấp thêm sau.

---

## 6. Bảo mật cần làm ngay sau khi deploy

1. Đăng nhập bằng tài khoản admin mặc định → vào **Người Dùng** → **Đổi Mật Khẩu Của Tôi** → đặt mật khẩu mới mạnh hơn
2. Không chia sẻ `JWT_SECRET` hay `DATABASE_URL` cho người ngoài
3. Mỗi nhân viên nên có 1 tài khoản riêng (không dùng chung 1 tài khoản) để dễ theo dõi ai thao tác gì
