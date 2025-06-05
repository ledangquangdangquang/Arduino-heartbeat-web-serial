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
  BPMs = BPMs.map(bpm => +(bpm + systematicError).toFixed(2));

  // --- Thống kê ban đầu ---
  const meanRaw = BPMs.reduce((a, b) => a + b, 0) / BPMs.length;
  const varianceRaw = BPMs.reduce((sum, val) => sum + (val - meanRaw) ** 2, 0) / BPMs.length;
  const stdDevRaw = Math.sqrt(varianceRaw);

  // --- Hiển thị dữ liệu với dòng bị loại tô đỏ ---
  // const rawTextOriginal = output.textContent.trim(); // lưu lại bản gốc trước khi tô màu
  const rawTextOriginal = lines.join('\n'); 
  output.innerHTML = lines.map(line => {
    const match = line.match(/BPM=(\d+(\.\d+)?)/);
    const bpm = match ? parseFloat(match[1]) : null;
    const isOutlier = bpm !== null && Math.abs(bpm - meanRaw) > 3 * stdDevRaw;
    return `<div style="text-decoration :${isOutlier ? 'line-through' : 'none'}; color:${isOutlier ? 'red' : 'none'}">${line}</div>`;
  }).join('');

  // --- Lọc sai số ±3σ ---
  const filteredBPMs = BPMs.filter(val => Math.abs(val - meanRaw) <= 3 * stdDevRaw);

  // --- Tính lại sau lọc ---
  const mean = filteredBPMs.reduce((a, b) => a + b, 0) / filteredBPMs.length;
  const variance = filteredBPMs.reduce((sum, val) => sum + (val - mean) ** 2, 0) / filteredBPMs.length;
  const stdDev = Math.sqrt(variance);

  // --- Tính khoảng tin cậy 99% theo dạng ±
  const n = filteredBPMs.length;
  const t_value = 2.756; // với 99% tin cậy, df = 29
  const standardError = stdDev / Math.sqrt(n);
  const delta = t_value * standardError;
  // --- Hiển thị kết quả trong HTML ---
  stats.textContent =
`❗ Sai số hệ thống: +${systematicError}bpm
📊 BPMs (sau khi bù sai số hệ thống): [${BPMs.join(', ')}]
📈 Trung bình: ${meanRaw.toFixed(2)}
📉 Độ lệch chuẩn: ${stdDevRaw.toFixed(2)}
🧹 BPMs sau khi lọc sai số: [${filteredBPMs.join(', ')}]
📈 Trung bình (sau khi lọc): ${mean.toFixed(2)}
📉 Độ lệch chuẩn (sau khi lọc): ${stdDev.toFixed(2)}
🔒 Khoảng tin cậy 99%: ${mean.toFixed(2)} ± ${delta.toFixed(2)} bpm`;
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
          borderColor: '#076678',             // Xanh đậm Gruvbox
          pointBackgroundColor: '#076678',
          pointBorderColor: '#076678',
          fill: false
        },
        {
          label: 'Vùng ±3σ (~99.7%)',
          data: shadedY,
          backgroundColor: 'rgba(250,189,47,0.3)',  // Vàng sáng Gruvbox
          borderColor: 'rgba(0,0,0,0)',
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
          text: 'Biểu đồ phân phối chuẩn từ BPM sau khi lọc sai số',
          color: '#3c3836', // màu chữ chính
          font: {
            size: 18
          }
        },
        legend: {
          labels: {
            usePointStyle: true,
            color: '#504945', // màu chữ phụ
            font: {
              size: 14
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'BPM',
            color: '#3c3836',
            font: { size: 16 }
          },
          ticks: {
            color: '#504945',
            callback: function(value) {
              return value.toFixed(2);
            }
          },
          grid: {
            color: '#d5c4a1' // màu lưới nhẹ
          }
        },
        y: {
          title: {
            display: true,
            text: 'Mật độ xác suất',
            color: '#3c3836',
            font: { size: 16 }
          },
          ticks: {
            color: '#504945'
          },
          grid: {
            color: '#d5c4a1'
          }
        }
      }
    }
});


// --- Tải về file csv ---
document.getElementById('download').addEventListener('click', () => {
  const rawLines = rawTextOriginal.split('\n');

  const rawBPMs = rawLines.map(line => {
    const match = line.match(/BPM=(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }).filter(v => v !== null);

  const correctedBPMs = rawBPMs.map(bpm => bpm + systematicError);

  const mean = correctedBPMs.reduce((a, b) => a + b, 0) / correctedBPMs.length;
  const stdDev = Math.sqrt(correctedBPMs.reduce((sum, val) => sum + (val - mean) ** 2, 0) / correctedBPMs.length);

  let csvContent = 'Raw BPM,BPM compensates for system errors,BPM eliminates raw errors\n';

  for (let i = 0; i < rawBPMs.length; i++) {
    const raw = rawBPMs[i];
    const corrected = correctedBPMs[i];
    const isValid = Math.abs(corrected - mean) <= 3 * stdDev;
    const cleaned = isValid ? corrected.toFixed(2) : '';
    csvContent += `${raw.toFixed(2)},${corrected.toFixed(2)},${cleaned}\n`;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'bpm_data.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});}

document.getElementById('calculate').addEventListener('click', calculateStats);
