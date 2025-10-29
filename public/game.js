const socket = io();

// ====================== GIAO DIỆN ======================
const welcomeScreen = document.getElementById("welcome-screen");
const menuScreen = document.getElementById("menu-screen");
const gameCanvas = document.getElementById("gameCanvas");

const startBtn = document.getElementById("start-btn");
const randomBtn = document.getElementById("random-btn");
const createBtn = document.getElementById("create-btn");
const joinBtn = document.getElementById("join-btn");
const roomInput = document.getElementById("room-input");
const roomInfo = document.getElementById("room-info");

startBtn.onclick = () => {
  welcomeScreen.classList.add("hidden");
  menuScreen.classList.remove("hidden");
};

// ====================== SOCKET ======================
randomBtn.onclick = () => socket.emit("playRandom");
createBtn.onclick = () => socket.emit("createRoom");
joinBtn.onclick = () => {
  const code = roomInput.value.trim().toUpperCase();
  if (code) socket.emit("joinRoom", code);
};

socket.on("waiting", (msg) => {
  roomInfo.innerHTML = `<b>${msg}</b>`;
});

socket.on("roomCreated", (code) => {
  roomInfo.innerHTML = `🎮 Phòng của bạn: <b>${code}</b><br>Gửi mã này cho bạn bè!`;
});

socket.on("startGame", ({ roomCode }) => {
  menuScreen.classList.add("hidden");
  gameCanvas.classList.remove("hidden");
  startGame(roomCode);
});

socket.on("roomError", (msg) => {
  roomInfo.innerHTML = `<span style="color:red">${msg}</span>`;
});

socket.on("playerLeft", (msg) => {
  alert(msg);
  location.reload();
});

// ====================== GAME ======================
function startGame(roomCode) {
  const ctx = gameCanvas.getContext("2d");
  let ballX = 400,
      ballY = 250,
      ballSpeedX = 2,
      ballSpeedY = 2;

  function draw() {
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(ballX, ballY, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  function update() {
    ballX += ballSpeedX;
    ballY += ballSpeedY;
    if (ballX < 0 || ballX > 800) ballSpeedX *= -1;
    if (ballY < 0 || ballY > 500) ballSpeedY *= -1;
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  loop();
}
