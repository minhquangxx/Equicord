# Animated Status

Plugin Vencord cho phép tạo hiệu ứng động cho trạng thái Discord của bạn bằng cách xoay vòng qua nhiều trạng thái khác nhau.

## Tính năng

- 🔄 Xoay vòng qua nhiều trạng thái tùy chỉnh
- 😀 Hỗ trợ cả emoji Unicode và emoji tùy chỉnh (Nitro)
- ⏱️ Cấu hình thời gian hiển thị cho từng khung hình
- 🎲 Tùy chọn ngẫu nhiên hóa thứ tự trạng thái
- 💾 Lưu trữ cấu hình animation của bạn

## Cách sử dụng

1. Bật plugin trong **Cài đặt → Plugins → Animated Status**
2. Cấu hình các khung hình animation:
   - **Status Text**: Văn bản hiển thị trong trạng thái
   - **Emoji Name**: Emoji Unicode (😀) hoặc tên emoji
   - **Emoji ID**: Dành cho người dùng Nitro, ID của emoji tùy chỉnh
   - **Duration**: Thời gian hiển thị khung hình này (tối thiểu 2900ms)
3. Thêm nhiều khung hình để tạo animation
4. Nhấn "**Save Animation**" để áp dụng thay đổi

## Tùy chọn cấu hình

- **Default Duration**: Đặt thời gian mặc định cho tất cả khung hình (có thể ghi đè cho từng khung)
- **Randomize**: Bật để hiển thị khung hình theo thứ tự ngẫu nhiên thay vì tuần tự

## Ví dụ Animation

### Xoay vòng văn bản đơn giản
```
Khung 1: "Đang làm dự án" ⏱️ 5000ms
Khung 2: "Đang nghỉ giải lao" ⏱️ 3000ms
Khung 3: "Quay lại code!" ⏱️ 5000ms
```

### Animation Emoji
```
Khung 1: "Đang code" 💻 ⏱️ 3000ms
Khung 2: "Đang code" ⌨️ ⏱️ 3000ms
Khung 3: "Đang code" 🖥️ ⏱️ 3000ms
```

### 🕐 Đồng hồ (Clock) - Nâng cao

Hiển thị emoji đồng hồ tự động cập nhật theo giờ hiện tại:

**Cấu hình:**
- **Status Text**: *(để trống)*
- **Emoji Name**: 
  ```javascript
  eval ['🕛','🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚'][((new Date()).getHours()%12)]
  ```
- **Duration**: 3000ms

**Kết quả**: Emoji đồng hồ tự động đổi theo giờ (🕐 → 🕑 → 🕒...)

### 🕐 Đồng hồ + Thời gian (Clock And Text) - Nâng cao

Hiển thị cả emoji đồng hồ và thời gian số chi tiết:

**Cấu hình:**
- **Status Text**: 
  ```javascript
  eval let fmt=t=>(t<10?'0':'')+t;let d=new Date();`${fmt(d.getHours())}:${fmt(d.getMinutes())}:${fmt(d.getSeconds())}`
  ```
- **Emoji Name**: 
  ```javascript
  eval ['🕛','🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚'][((new Date()).getHours()%12)]
  ```
- **Duration**: 3000ms

**Kết quả**: 🕚 11:34:37 (cập nhật real-time)

### Các ví dụ khác với `eval`

#### Ngày tháng hiện tại
```javascript
eval new Date().toLocaleDateString('vi-VN')
```

#### Thời gian đơn giản
```javascript
eval new Date().toLocaleTimeString('vi-VN')
```

#### Thông điệp theo giờ
```javascript
eval (new Date().getHours() < 12 ? "Chào buổi sáng! ☀️" : new Date().getHours() < 18 ? "Chào buổi chiều! 🌤️" : "Chào buổi tối! 🌙")
```

## Lưu ý

- Thời gian tối thiểu cho mỗi khung hình là 2900ms để tránh bị giới hạn tốc độ (rate limiting)
- ID emoji tùy chỉnh (tính năng Nitro) có thể tìm bằng cách gõ `\:tên_emoji:` trong Discord
- Animation sẽ tự động khởi động lại khi plugin được bật lại hoặc sau khi lưu thay đổi

### 💡 JavaScript động với `eval`

Plugin hỗ trợ sử dụng JavaScript động trong trường **Status Text** và **Emoji Name**:

- **Cú pháp**: Bắt đầu với `eval` theo sau là code JavaScript
- **Ví dụ**: `eval new Date().toLocaleTimeString()`
- **Lưu ý**: Code sẽ được thực thi mỗi lần khung hình được hiển thị
- **Bảo mật**: Chỉ sử dụng code bạn hiểu và tin tượng, tránh copy code từ nguồn không rõ ràng

## Credits

Dựa trên [BetterDiscord Animated Status plugin](https://github.com/toluschr/BetterDiscord-Animated-Status) của toluschr và SirSlender.
