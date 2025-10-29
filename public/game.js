const socket = io();
const lobbyDiv = document.getElementById('lobby');
const gameContainerDiv = document.getElementById('game-container');
const msgDiv = document.getElementById('message');
const roomIdInput = document.getElementById('roomIdInput');
const joinButton = document.getElementById('joinButton');
const randomButton = document.getElementById('randomButton');

// Khi nhấn nút "Tạo phòng riêng" hoặc "Tham gia"
joinButton.addEventListener('click', () => {
  const roomCode = roomIdInput.value.trim().toUpperCase();
  if (!roomCode) {
    alert("Vui lòng nhập ID phòng!");
    return;
  }
  socket.emit("joinRoom", roomCode);
  msgDiv.textContent = `🔑 Đang tham gia phòng ${roomCode}...`;
});

// Khi nhấn nút "Tìm trận ngẫu nhiên"
randomButton.addEventListener('click', () => {
  msgDiv.textContent = "🎲 Đang tìm người chơi ngẫu nhiên...";
  socket.emit("playRandom");
});

// Khi server báo tạo phòng thành công
socket.on("roomCreated", (code) => {
  msgDiv.textContent = `✅ Phòng của bạn: ${code} (chờ người khác tham gia)`;
});

// Khi server báo bắt đầu game
socket.on("startGame", (data) => {
  msgDiv.textContent = `🚀 Trận đấu bắt đầu! Mã phòng: ${data.roomCode}`;
  lobbyDiv.style.display = "none";
  gameContainerDiv.style.display = "block";
});

// Khi server báo đang chờ người khác
socket.on("waiting", (msg) => {
  msgDiv.textContent = msg;
});

// Khi lỗi phòng
socket.on("roomError", (msg) => {
  alert(msg);
});

// Khi đối thủ thoát
socket.on("playerLeft", (msg) => {
  alert(msg);
  lobbyDiv.style.display = "block";
  gameContainerDiv.style.display = "none";
});
