const output = document.getElementById('output');
const stats = document.getElementById('stats');
const systematicError = 5;



document.getElementById('connect').addEventListener('click', async () => {
  let port;
  let reader;
  let inputDone;

  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    const decoder = new TextDecoderStream();
    inputDone = port.readable.pipeTo(decoder.writable);
    const inputStream = decoder.readable;
    reader = inputStream.getReader();

    let buffer = "";
    let sampleCount = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;

      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes("IR=") && trimmed.includes("BPM=")) {
          sampleCount++;
          console.log(`✅ Mẫu ${sampleCount}: ${trimmed}`);
          output.textContent += trimmed + "\n";
        }

        if (sampleCount >= 30) {
          break;
        }
      }

      if (sampleCount >= 30) {
        break;
      }
    }

    // 🟢 BƯỚC QUAN TRỌNG: Đóng reader và đợi decoder hoàn tất
    reader.releaseLock();
    await inputDone;

    // 🟢 Sau đó mới được đóng cổng
    await port.close();
    alert("✅ Đã đủ 30 mẫu và đóng cổng thành công");
  } catch (err) {
    console.error("❌ Lỗi:", err);
    if (reader) {
      try {
        reader.releaseLock();
      } catch {}
    }
    if (port) {
      try {
        await port.close();
      } catch {}
    }
  }
});
function calculateStats() {
// --- Tách chuỗi thành mảng BPMs ---
const lines = output.textContent.trim().split('\n');
let BPMs = lines.map(line => {
  const match = line.match(/BPM=(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}).filter(v => v !== null);
 // --- Cộng bù sai số hệ thống ---
BPMs = BPMs.map(bpm => bpm + systematicError);

// --- Thống kê ban đầu ---
const meanRaw = BPMs.reduce((a, b) => a + b, 0) / BPMs.length;
const varianceRaw = BPMs.reduce((sum, val) => sum + (val - meanRaw) ** 2, 0) / BPMs.length;
const stdDevRaw = Math.sqrt(varianceRaw);

// --- Hiển thị dữ liệu với dòng bị loại tô đỏ ---
const rawTextOriginal = output.textContent.trim(); // lưu lại bản gốc trước khi tô màu
output.innerHTML = lines.map(line => {
  const match = line.match(/BPM=(\d+(\.\d+)?)/);
  const bpm = match ? parseFloat(match[1]) : null;
  const isOutlier = bpm !== null && Math.abs(bpm - meanRaw) > 3 * stdDevRaw;
  return `<div style="text-decoration :${isOutlier ? 'line-through' : 'none'}; color:${isOutlier ? 'red' : 'black'}">${line}</div>`;
}).join('');

// --- Lọc sai số ±3σ ---
const filteredBPMs = BPMs.filter(val => Math.abs(val - meanRaw) <= 3 * stdDevRaw);

// --- Tính lại sau lọc ---
const mean = filteredBPMs.reduce((a, b) => a + b, 0) / filteredBPMs.length;
const variance = filteredBPMs.reduce((sum, val) => sum + (val - mean) ** 2, 0) / filteredBPMs.length;
const stdDev = Math.sqrt(variance);

// --- Hiển thị kết quả trong HTML ---
stats.textContent =
`❗ Sai số hệ thống: +${systematicError}bpm
📊 BPMs (sau khi bù sai số hệ thống): [${BPMs.join(', ')}]
📈 Trung bình: ${meanRaw.toFixed(2)}
📉 Độ lệch chuẩn: ${stdDevRaw.toFixed(2)}
🧹 BPMs sau khi lọc sai số: [${filteredBPMs.join(', ')}]
📈 Trung bình (sau khi lọc): ${mean.toFixed(2)}
📉 Độ lệch chuẩn (sau khi lọc): ${stdDev.toFixed(2)}`;

// --- Hàm PDF chuẩn ---
function normalPDF(x, mean, stdDev) {
  return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / stdDev) ** 2);
}

// --- Tính tích phân vùng ±3σ ---
function integrateNormalPDF(a, b, mean, stdDev, steps = 1000) {
  const step = (b - a) / steps;
  let area = 0;
  for (let i = 0; i < steps; i++) {
    const x0 = a + i * step;
    const x1 = x0 + step;
    area += 0.5 * (normalPDF(x0, mean, stdDev) + normalPDF(x1, mean, stdDev)) * step;
  }
  return area;
}

const area = integrateNormalPDF(mean - 3 * stdDev, mean + 3 * stdDev, mean, stdDev);
stats.textContent += `\n✅ Diện tích dưới đường cong ±3σ: ${(area * 100).toFixed(2)}%`;

// --- Tạo dữ liệu đường cong ---
const xValues = [];
const yValues = [];
const step = (6 * stdDev) / 100;
for (let x = mean - 3 * stdDev; x <= mean + 3 * stdDev; x += step) {
  xValues.push(x);
  yValues.push(normalPDF(x, mean, stdDev));
}

// --- Dữ liệu tô vùng đỏ ±3σ ---
const shadedY = xValues.map(x => (
  (x >= mean - 3 * stdDev && x <= mean + 3 * stdDev) ? normalPDF(x, mean, stdDev) : null
));

// --- Vẽ biểu đồ ---
new Chart(document.getElementById('normalChart').getContext('2d'), {
  type: 'line',
  data: {
    labels: xValues,
    datasets: [
      {
        label: 'Phân phối chuẩn (sau lọc)',
        data: yValues,
        borderWidth: 2,
        tension: 0.2,
        borderColor: 'blue',
        fill: false
      },
      {
        label: 'Vùng ±3σ (~99.7%)',
        data: shadedY,
        backgroundColor: 'rgba(255, 0, 0, 0.3)',
        borderColor: 'rgba(255, 0, 0, 0)',
        pointRadius: 0,
        fill: true,
        tension: 0.2
      }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Biểu đồ phân phối chuẩn từ BPM sau khi lọc sai số'
      },
      legend: {
        labels: {
          usePointStyle: true
        }
      }
    },
    scales: {
    x: {
  title: { display: true, text: 'BPM' },
  ticks: {
    callback: function(value) {
      return value.toFixed(2); // chỉ giữ 2 chữ số sau dấu phẩy
    }
  }
},
      y: {
        title: { display: true, text: 'Mật độ xác suất' }
      }
    }
  }
});

// --- Tải về file csv ---
document.getElementById('download').addEventListener('click', () => {
  const rawText = document.getElementById('output').textContent.trim();
  const lines = rawTextOriginal.split('\n');

  let csvContent = 'IR,BPM\n'; // tiêu đề cột

  lines.forEach(line => {
    const irMatch = line.match(/IR=(\d+)/);
    const bpmMatch = line.match(/BPM=(\d+(\.\d+)?)/);

    if (irMatch && bpmMatch) {
      const ir = irMatch[1];
      const bpm = bpmMatch[1];
      csvContent += `${ir},${bpm}\n`;
    }
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'bpm_data.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});
}

document.getElementById('calculate').addEventListener('click', calculateStats);
