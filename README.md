# Draexl IT

Cổng quản lý thiết bị IT với danh mục tài sản, hồ sơ nhân viên, phòng ban, nhập xuất kho, kiểm kê và nhật ký thao tác. Phiếu bàn giao và thu hồi khi nghỉ việc có thể tải xuống dạng Word hoặc in và lưu PDF từ hộp thoại in.

## Chạy trên máy phát triển

Cài Node.js 24 trở lên và pnpm. Trong thư mục dự án, đặt mật khẩu thử nghiệm cho tài khoản quản trị và chạy bản xem trước.

PowerShell:

```powershell
$env:ADMIN_PASSWORD = [guid]::NewGuid().ToString('N')
Write-Host "Mật khẩu thử nghiệm: $env:ADMIN_PASSWORD"
pnpm install --frozen-lockfile
node build.mjs
node preview.mjs
```

macOS hoặc Linux:

```sh
export ADMIN_PASSWORD="$(node -p 'crypto.randomUUID()')"
printf 'Mật khẩu thử nghiệm: %s\n' "$ADMIN_PASSWORD"
pnpm install --frozen-lockfile
node build.mjs
node preview.mjs
```

Mở địa chỉ được in trong terminal và đăng nhập bằng tài khoản **admin** cùng mật khẩu thử nghiệm. Bản xem trước lưu dữ liệu trong tệp SQLite ở thư mục .local. Kho mẫu có 1.000 thiết bị giả lập để thử thao tác. Chọn **Kho công ty** để thử trên danh mục riêng.

## Cấu trúc dự án

| Vị trí | Nội dung |
| --- | --- |
| src/ | Giao diện, logo và mã máy chủ |
| drizzle/ | Các phiên bản cấu trúc cơ sở dữ liệu |
| hosting/cloudflare-pages/ | Worker chuyển tiếp tùy chọn cho địa chỉ Cloudflare Pages |
| build.mjs và preview.mjs | Đóng gói ứng dụng và chạy thử cục bộ |
| wrangler.toml | Mẫu cấu hình Cloudflare Workers và D1 |

## Đóng góp

1. Fork repository trên GitHub, rồi clone bản fork về máy.
2. Tạo nhánh cho thay đổi, chạy bản xem trước và kiểm tra phần đã sửa.
3. Đẩy nhánh lên bản fork. Mở pull request vào nhánh main của dự án để chủ dự án xem và hợp nhất.

Các thay đổi trong pull request được thử với dữ liệu giả lập hoặc cơ sở dữ liệu phát triển. Chủ dự án triển khai website sau khi duyệt bản cập nhật.

## Triển khai thử trên Cloudflare Workers

1. Đăng nhập Wrangler bằng tài khoản Cloudflare dùng để triển khai.
2. Chạy **wrangler d1 create draexl-it**. Điền ID cơ sở dữ liệu phát triển vào **wrangler.toml**.
3. Chạy **wrangler d1 migrations apply DB --remote** để tạo các bảng.
4. Chạy **node build.mjs**, sau đó đặt mật khẩu khởi tạo qua **wrangler secret put ADMIN_PASSWORD**.
5. Chạy **wrangler deploy** và mở địa chỉ Worker được in ra.

### Chạy trực tiếp trên Cloudflare Pages

Tạo dự án Pages dạng Direct Upload. Sau khi build, đưa `dist/server/index.js` vào thư mục xuất bản Pages dưới tên `_worker.js`. Trong cấu hình Wrangler dành cho Pages, đặt `pages_build_output_dir` thành thư mục xuất bản và khai báo D1 binding `DB` trỏ tới cơ sở dữ liệu đã chạy migrations. Đặt `ADMIN_PASSWORD` dưới dạng secret của dự án Pages. Chạy `wrangler pages deploy` bằng cấu hình Pages.

Nếu dùng Cloudflare Pages làm địa chỉ chuyển tiếp, đặt biến môi trường **UPSTREAM_ORIGIN** thành địa chỉ HTTPS của Worker đã triển khai, rồi triển khai thư mục **hosting/cloudflare-pages** vào một dự án Pages. Tài khoản **admin** quản lý tài khoản và phân quyền trong mục **Tài khoản**.

### Mẫu phiếu công ty

Sau khi chạy migrations, dùng `node company-template.mjs <mẫu.xlsx> <mẫu.sql>` để chuẩn bị mẫu một sheet của công ty. Nạp tệp SQL vào D1 với `wrangler d1 execute DB --remote --file <mẫu.sql>`. Giữ cả hai tệp ở nơi riêng tư. Mẫu được lưu trong D1 và ứng dụng cung cấp bản Excel, Word, PDF qua các chức năng dành cho tài khoản đã đăng nhập.
