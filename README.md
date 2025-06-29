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
> ⚠️ **NOTE**  
> Có thể dùng bookmarklet này thay thế cho việc kết nối thiết bị (khi đó không dùng cảm biến hay mạch ngoài).
> `javascript:(function()%7Blet%20sampleIndex%20%3D%200%3B%0Aconst%20maxSamples%20%3D%2030%3B%0A%0Aconst%20specialBPMIndices%20%3D%20new%20Set()%3B%0Awhile%20(specialBPMIndices.size%20%3C%202)%20%7B%0A%20%20specialBPMIndices.add(Math.floor(Math.random()%20*%20maxSamples))%3B%0A%7D%0A%0Afunction%20generateSample()%20%7B%0A%20%20const%20IR%20%3D%20Math.floor(127000%20%2B%20Math.random()%20*%201500)%3B%0A%0A%20%20const%20BPM%20%3D%20specialBPMIndices.has(sampleIndex)%0A%20%20%20%20%3F%20'200.00'%0A%20%20%20%20%3A%20(60%20%2B%20Math.random()%20*%2040).toFixed(2)%3B%0A%0A%20%20return%20%60IR%3D%24%7BIR%7D%20BPM%3D%24%7BBPM%7D%60%3B%0A%7D%0A%0Aconst%20intervalId%20%3D%20setInterval(()%20%3D%3E%20%7B%0A%20%20if%20(sampleIndex%20%3E%3D%20maxSamples)%20%7B%0A%20%20%20%20clearInterval(intervalId)%3B%0A%20%20%20%20return%3B%0A%20%20%7D%0A%0A%20%20const%20line%20%3D%20generateSample()%3B%0A%20%20output.textContent%20%2B%3D%20line%20%2B%20'%5Cn'%3B%0A%20%20sampleIndex%2B%2B%3B%0A%7D%2C%20200)%3B%7D)()%3B`
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

