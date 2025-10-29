const socket = io();
let roomJoined = false;

// =================== GIAO DIỆN ===================
document.addEventListener("DOMContentLoaded", () => {
  const container = document.createElement("div");
  container.style.textAlign = "center";
  container.style.marginTop = "40px";

  const info = document.createElement("div");
  const createBtn = document.createElement("button");
  const joinBtn = document.createElement("button");
  const input = document.createElement("input");

  createBtn.innerText = "🎮 Tạo phòng mới";
  joinBtn.innerText = "🔑 Tham gia phòng";
  input.placeholder = "Nhập mã phòng";

  createBtn.style.margin = "5px";
  joinBtn.style.margin = "5px";
  input.style.margin = "5px";

  container.appendChild(info);
  container.appendChild(createBtn);
  container.appendChild(document.createElement("br"));
  container.appendChild(input);
  container.appendChild(joinBtn);
  document.body.prepend(container);

  createBtn.onclick = () => socket.emit("createRoom");
  joinBtn.onclick = () => {
    const code = input.value.trim().toUpperCase();
    if (code) socket.emit("joinRoom", code);
  };

  socket.on("roomCreated", (code) => {
    info.innerHTML = `<b>Phòng của bạn: ${code}</b><br>Chờ người khác nhập mã để vào`;
  });

  socket.on("startGame", ({ roomCode }) => {
    info.innerHTML = `<b>Phòng ${roomCode}: Trận đấu bắt đầu!</b>`;
    startGame(); // Bắt đầu game khi đủ 2 người
    roomJoined = true;
  });

  socket.on("roomError", (msg) => {
    info.innerHTML = `<span style="color:red">${msg}</span>`;
  });

  socket.on("playerLeft", (msg) => {
    info.innerHTML = `<span style="color:red">${msg}</span>`;
    roomJoined = false;
  });
});

// =================== GAME LOGIC ===================
function startGame() {
  // Giảm tốc độ bóng lại
  ballSpeedX = 2.5;
  ballSpeedY = 2.5;
  // Gọi lại hàm gameLoop() hoặc phần khởi tạo của bạn ở đây
}
