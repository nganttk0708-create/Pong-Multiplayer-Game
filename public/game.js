const socket = io();

// 🎬 Các màn hình
const welcome = document.getElementById("welcome-screen");
const menu = document.getElementById("menu-screen");
const game = document.getElementById("game-screen");

const startBtn = document.getElementById("start-btn");
const randomBtn = document.getElementById("random-btn");
const createBtn = document.getElementById("create-btn");
const joinToggle = document.getElementById("join-toggle");
const joinBtn = document.getElementById("join-btn");
const restartBtn = document.getElementById("restart-btn");
const exitBtn = document.getElementById("exit-btn");

const roomInput = document.getElementById("room-input");
const info = document.getElementById("info");
const roomCodeSpan = document.getElementById("room-code");
const createSection = document.getElementById("create-section");
const joinSection = document.getElementById("join-section");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let ball = { x: 400, y: 250, dx: 3, dy: 3, radius: 10 };
let running = false;

// ================== CHUYỂN MÀN HÌNH ==================
startBtn.onclick = () => {
  welcome.classList.add("hidden");
  menu.classList.remove("hidden");
};

exitBtn.onclick = () => {
  game.classList.add("hidden");
  menu.classList.remove("hidden");
  running = false;
};

restartBtn.onclick = () => {
  startGame();
};

// ================== SOCKET ==================
randomBtn.onclick = () => socket.emit("playRandom");
createBtn.onclick = () => {
  socket.emit("createRoom");
  createSection.classList.remove("hidden");
};
joinToggle.onclick = () => {
  joinSection.classList.toggle("hidden");
};

joinBtn.onclick = () => {
  const code = roomInput.value.trim().toUpperCase();
  if (code) socket.emit("joinRoom", code);
};

socket.on("waiting", (msg) => (info.innerText = msg));

socket.on("roomCreated", (code) => {
  roomCodeSpan.innerText = code;
  info.innerText = "Chờ người khác vào phòng...";
});

socket.on("startGame", ({ roomCode }) => {
  info.innerText = `Phòng ${roomCode} bắt đầu!`;
  menu.classList.add("hidden");
  game.classList.remove("hidden");
  startGame();
});

socket.on("roomError", (msg) => (info.innerText = msg));
socket.on("playerLeft", (msg) => alert(msg));

// ================== GAME LOGIC ==================
function startGame() {
  ball = { x: 400, y: 250, dx: 2.5, dy: 2.5, radius: 10 };
  running = true;
  gameLoop();
}

function gameLoop() {
  if (!running) return;
  updateBall();
  drawBall();
  requestAnimationFrame(gameLoop);
}

function updateBall() {
  ball.x += ball.dx;
  ball.y += ball.dy;
  if (ball.x < 10 || ball.x > 790) ball.dx *= -1;
  if (ball.y < 10 || ball.y > 490) ball.dy *= -1;
}

function drawBall() {
  ctx.clearRect(0, 0, 800, 500);
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
}
