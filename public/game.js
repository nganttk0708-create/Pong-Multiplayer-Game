const socket = io();

const lobbyDiv = document.getElementById("lobby");
const gameContainerDiv = document.getElementById("game-container");
const msgDiv = document.getElementById("message");

const joinButton = document.getElementById("joinButton");
const randomButton = document.getElementById("randomButton");
const roomIdInput = document.getElementById("roomIdInput");

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let gameStarted = false;

// ====== NÚT ======
joinButton.addEventListener("click", () => {
  const code = roomIdInput.value.trim().toUpperCase();
  if (!code) return alert("Vui lòng nhập ID phòng!");
  socket.emit("joinRoom", code);
  msgDiv.textContent = `🔑 Đang tham gia phòng ${code}...`;
});

randomButton.addEventListener("click", () => {
  msgDiv.textContent = "🎲 Đang tìm người chơi ngẫu nhiên...";
  socket.emit("playRandom");
});

// ====== SERVER EVENTS ======
socket.on("waiting", (msg) => {
  msgDiv.textContent = msg;
});

socket.on("roomCreated", (code) => {
  msgDiv.textContent = `✅ Phòng của bạn: ${code} (chờ người khác tham gia)`;
});

socket.on("startGame", (data) => {
  lobbyDiv.style.display = "none";
  gameContainerDiv.style.display = "block";
  msgDiv.textContent = `🚀 Trận đấu bắt đầu! Mã phòng: ${data.roomCode}`;
  gameStarted = true;
  startFakeGameLoop(); // hiển thị canvas hoạt động
});

socket.on("roomError", (msg) => alert(msg));

socket.on("playerLeft", (msg) => {
  alert(msg);
  gameStarted = false;
  lobbyDiv.style.display = "block";
  gameContainerDiv.style.display = "none";
});

// ====== GIẢ LẬP GAME ======
function startFakeGameLoop() {
  let x = 0;
  const loop = () => {
    if (!gameStarted) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(50 + x, 200, 15, 0, Math.PI * 2);
    ctx.fill();
    x += 3;
    if (x > canvas.width) x = 0;
    requestAnimationFrame(loop);
  };
  loop();
}
