// Kết nối socket.io tới server Render hoặc local
const socket = io(window.location.origin, {
  transports: ["websocket"],
  secure: true,
});

const lobbyDiv = document.getElementById("lobby");
const gameDiv = document.getElementById("game");
const messageDiv = document.getElementById("message");
const joinBtn = document.getElementById("joinBtn");
const randomBtn = document.getElementById("randomBtn");
const roomInput = document.getElementById("roomInput");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let gameStarted = false;

// =========================
// 🔘 NÚT BẤM
// =========================
joinBtn.addEventListener("click", () => {
  const code = roomInput.value.trim().toUpperCase();
  if (!code) return alert("Vui lòng nhập ID phòng!");
  socket.emit("joinRoom", code);
  messageDiv.textContent = `🔑 Đang tham gia phòng ${code}...`;
});

randomBtn.addEventListener("click", () => {
  messageDiv.textContent = "🎲 Đang tìm người chơi khác...";
  socket.emit("playRandom");
});

// =========================
// 🧠 LẮNG NGHE SERVER
// =========================
socket.on("connect", () => console.log("🟢 Socket.IO đã kết nối"));
socket.on("connect_error", (err) => console.error("❌ Lỗi kết nối:", err));

socket.on("waiting", (msg) => {
  messageDiv.textContent = msg;
});

socket.on("roomCreated", (code) => {
  messageDiv.textContent = `✅ Phòng của bạn: ${code} (chờ người khác tham gia)`;
});

socket.on("roomError", (msg) => alert(msg));

socket.on("startGame", (data) => {
  lobbyDiv.style.display = "none";
  gameDiv.style.display = "block";
  messageDiv.textContent = `🚀 Trận đấu bắt đầu! Mã phòng: ${data.roomCode}`;
  gameStarted = true;
  startDemoGame();
});

socket.on("playerLeft", (msg) => {
  alert(msg);
  resetLobby();
});

// =========================
// 🎮 GIẢ LẬP GAME
// =========================
function startDemoGame() {
  let x = 0;
  const loop = () => {
    if (!gameStarted) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#4CAF50";
    ctx.beginPath();
    ctx.arc(50 + x, 200, 15, 0, Math.PI * 2);
    ctx.fill();
    x += 3;
    if (x > canvas.width) x = 0;
    requestAnimationFrame(loop);
  };
  loop();
}

function resetLobby() {
  gameStarted = false;
  lobbyDiv.style.display = "block";
  gameDiv.style.display = "none";
  messageDiv.textContent = "";
}
