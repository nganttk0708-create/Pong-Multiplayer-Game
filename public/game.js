const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let players = {};
let ball = { x: 300, y: 200 };
let message = "";
let gameOver = false;

// Di chuyển paddle
document.addEventListener("mousemove", (e) => {
  if (gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const posY = e.clientY - rect.top;
  socket.emit("move", posY);
});

// Nghe dữ liệu cập nhật
socket.on("update", (data) => {
  players = data.players;
  ball = data.ball;
  draw();
});

socket.on("message", (msg) => {
  message = msg;
  setTimeout(() => (message = ""), 2000);
});

socket.on("gameOver", (data) => {
  if (gameOver) return;
  gameOver = true;
  message = `${data.winner} thắng trận!`;
  draw();
  console.log("🎮 Game over - hiển thị nút Chơi lại");
  showRestartOptions();
});3

// Khi trận tái đấu bắt đầu
socket.on("rematchStart", () => {
  console.log("🎯 Nhận sự kiện rematchStart từ server");
  gameOver = false; // ✅ Cho phép paddle di chuyển lại
  message = "🔁 Trận đấu mới bắt đầu!";
  draw();

  // Xóa nút chơi lại nếu còn
  const btn = document.getElementById("restartBtn");
  if (btn) {
    btn.remove();
    console.log("🧹 Đã xóa nút Chơi lại");
  }
});


function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";

  // Bóng
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
  ctx.fill();

  const ids = Object.keys(players);
  ids.forEach((id, i) => {
    const x = i === 0 ? 20 : canvas.width - 30;
    const y = players[id].y - 40;
    ctx.fillRect(x, y, 10, 80);

    // Điểm
    ctx.font = "20px Arial";
    ctx.fillText(players[id].score ?? 0, i === 0 ? 100 : canvas.width - 120, 30);
  });

  // Thông báo
  if (message) {
    ctx.font = "18px Arial";
    ctx.fillText(message, canvas.width / 2 - 100, 50);
  }
}

function showRestartOptions() {
  // Kiểm tra xem đã có nút chưa
  const existingBtn = document.getElementById("restartBtn");
  if (existingBtn) {
    console.log("⚠️ Nút Chơi lại đã tồn tại, không tạo thêm");
    return;
  }

  // Tìm vùng chứa nút
  const container = document.getElementById("buttonContainer");
  if (!container) {
    console.error("❌ Không tìm thấy #buttonContainer trong DOM!");
    return;
  }

  // Tạo nút mới
  const btn = document.createElement("button");
  btn.id = "restartBtn";
  btn.textContent = "Chơi lại";

  btn.onclick = () => {
    console.log("📩 Gửi requestRematch đến server");
    socket.emit("requestRematch");
    btn.disabled = true;
    message = "⏳ Đang chờ đối thủ...";
    draw();
  };

  container.appendChild(btn);
  console.log("✅ Đã thêm nút Chơi lại vào #buttonContainer");
}
