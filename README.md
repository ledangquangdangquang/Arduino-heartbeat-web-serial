# 📟 Arduino Heartbeat Web Serial

Dự án này cho phép bạn **kết nối Arduino với trình duyệt**, thu thập dữ liệu nhịp tim (BPM) từ cảm biến qua Serial và **phân tích dữ liệu trực tiếp** bằng JavaScript. Sau khi lấy đủ 30 mẫu, chương trình tính toán thống kê và hiển thị phân phối chuẩn.

---

## 🚀 Tính năng

- 🔌 Kết nối Arduino bằng Web Serial API
- 🧪 Tự động thu thập 30 mẫu nhịp tim từ Serial
- 📉 Tính trung bình, độ lệch chuẩn, loại bỏ sai số hệ thống
- 🧹 Lọc ngoại lai ±3σ (3 sigma)
- 📊 Vẽ biểu đồ phân phối chuẩn bằng Chart.js
- 📁 Xuất dữ liệu ra file CSV

---

## 🗂️ Cấu trúc dự án
```
├── index.html # Giao diện người dùng
├── style.css # Giao diện và bố cục
├── script.js # Xử lý logic Serial, thống kê và biểu đồ
```
---

## 🛠️ Cách sử dụng

1. **Kết nối phần cứng:**
   - Arduino sử dụng cảm biến nhịp tim và gửi dữ liệu qua Serial dạng:
     ```
     IR=xxxxx BPM=yy.yy
     ```

   - Code ví dụ trên Arduino:
     ```cpp
     Serial.print("IR=");
     Serial.print(irValue);
     Serial.print(" BPM=");
     Serial.println(beatsPerMinute);
     ```

2. **Mở `index.html` bằng trình duyệt hỗ trợ Web Serial (Chrome / Edge)**

3. **Click `Kết nối thiết bị` và chọn cổng serial của Arduino**

4. **Chờ đủ 30 mẫu**, sau đó click `Tính toán` để phân tích

5. **Click `Download csv file` để tải dữ liệu**

---

## 📊 Biểu đồ minh họa

> Sau khi lọc sai số, biểu đồ phân phối chuẩn sẽ được vẽ với vùng ±3σ được tô đỏ.


---

## 🌐 Yêu cầu trình duyệt

- Web Serial API (Chỉ hỗ trợ trên HTTPS hoặc localhost)
- Chrome 89+ / Edge 89+

---

## 📚 Công nghệ sử dụng

- HTML + CSS + JavaScript
- Web Serial API
- Chart.js (biểu đồ)
- Blob API (xuất file CSV)

