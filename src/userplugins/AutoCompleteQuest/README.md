# AutoCompleteQuest

Tự động hoàn thành Discord Quest mà không cần mở DevTools hay paste code.

## Tính năng

- ✅ Tự động hoàn thành các Discord Quest
- ✅ Hỗ trợ tất cả loại quest: WATCH_VIDEO, PLAY_ON_DESKTOP, STREAM_ON_DESKTOP, PLAY_ACTIVITY
- ✅ Tự động kiểm tra quest mới theo định kỳ
- ✅ Lệnh slash để hoàn thành quest thủ công
- ✅ Theo dõi tiến trình real-time

## Cách sử dụng

### Tự động (Khuyến nghị)

1. Bật plugin trong Equicord
2. Vào **Cài đặt Plugin** → **AutoCompleteQuest**
3. Bật **Auto Start** để tự động hoàn thành quest khi có quest mới
4. Điều chỉnh **Check Interval** để tự động kiểm tra quest mới (mặc định: 5 phút)
5. Nhận quest từ Discord → Quest tự động hoàn thành!

### Thủ công

Gõ lệnh trong bất kỳ kênh nào:
```
/completequest
```

## Cài đặt

### Auto Start
- **Mô tả**: Tự động bắt đầu hoàn thành quest khi phát hiện quest mới
- **Mặc định**: Tắt
- **Khuyến nghị**: Bật để tiện lợi nhất

### Check Interval
- **Mô tả**: Kiểm tra quest mới sau mỗi X phút (0 để tắt kiểm tra định kỳ)
- **Mặc định**: 5 phút
- **Khuyến nghị**: 5-10 phút

## Các loại Quest được hỗ trợ

### 1. WATCH_VIDEO / WATCH_VIDEO_ON_MOBILE
- Tự động giả lập việc xem video
- Không cần làm gì thêm
- Hoàn thành tự động theo thời gian quest yêu cầu

### 2. PLAY_ON_DESKTOP
- **Chỉ hoạt động trên Discord Desktop App**
- Giả lập việc chơi game
- Không cần mở game thật
- Đợi thời gian quest yêu cầu

### 3. STREAM_ON_DESKTOP  
- **Chỉ hoạt động trên Discord Desktop App**
- **Cần có ít nhất 1 người trong voice channel**
- Tham gia voice channel
- Stream bất kỳ cửa sổ nào
- Đợi thời gian quest yêu cầu

### 4. PLAY_ACTIVITY
- Tự động giả lập activity
- Không cần làm gì thêm
- Hoàn thành tự động

## Lưu ý quan trọng

### ⚠️ Rủi ro
Luôn có khả năng bị cấm khi sử dụng các công cụ tự động hoàn thành quest. Tuy nhiên, đến nay chưa có báo cáo nào về việc bị cấm do sử dụng plugin này hoặc các công cụ tương tự.

### 📱 Desktop App vs Browser
- Một số quest yêu cầu **bắt buộc phải dùng Discord Desktop App**
- Quest loại PLAY_ON_DESKTOP và STREAM_ON_DESKTOP chỉ hoạt động trên desktop
- Tải Discord Desktop: https://discord.com/download

### 🚫 Không thể làm được
- ❌ Không thể hoàn thành quest đã hết hạn
- ❌ Không tự động nhận quest hoặc claim phần thưởng (do có thể có captcha)
- ❌ Vesktop không phải desktop app thật sự, sẽ không hoạt động với một số quest

## FAQ

### Quest không hoàn thành?
1. Kiểm tra console để xem log lỗi
2. Đảm bảo bạn đã **nhận quest** từ Discord trước
3. Với STREAM quest: Phải có ít nhất 1 người khác trong VC
4. Với PLAY/STREAM quest: Phải dùng Discord Desktop App

### Làm sao biết quest đang hoàn thành?
- Xem toast notification ở góc màn hình
- Xem progress bar trong tab Quests của Discord
- Mở Console (Ctrl + Shift + I) để xem log chi tiết

### Plugin không tìm thấy quest?
- Đảm bảo bạn đã nhận quest từ Discord (Discover → Quests)
- Quest chưa hoàn thành và chưa hết hạn
- Đợi 1-2 phút sau khi nhận quest rồi thử lại

## Nguồn gốc

Plugin này được phát triển dựa trên script gốc:
- Script gốc: [CompleteDiscordQuest.md](https://gist.github.com/aamiaa/204cd9d42013ded9faf646fae7f89fbb)
- Được chuyển thành plugin Equicord bởi: Quang Blue

## License

GPL-3.0 - Giống với script gốc
