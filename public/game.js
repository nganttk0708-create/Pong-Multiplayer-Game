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
// ================== GAME LOGIC ==================
function startGame() {
  // Biến game
  const paddleHeight = 100;
  const paddleWidth = 15;

  let leftPaddle = { x: 20, y: canvas.height / 2 - paddleHeight / 2 };
  let rightPaddle = { x: canvas.width - 35, y: canvas.height / 2 - paddleHeight / 2 };

  let ball = { x: canvas.width / 2, y: canvas.height / 2, dx: 3, dy: 3, radius: 10 };
  let running = true;

  // Phím điều khiển
  const keys = {};

  document.addEventListener("keydown", (e) => (keys[e.key] = true));
  document.addEventListener("keyup", (e) => (keys[e.key] = false));

  function movePaddles() {
    // W/S cho bên trái
    if (keys["w"] && leftPaddle.y > 0) leftPaddle.y -= 6;
    if (keys["s"] && leftPaddle.y < canvas.height - paddleHeight) leftPaddle.y += 6;
    // ↑/↓ cho bên phải
    if (keys["ArrowUp"] && rightPaddle.y > 0) rightPaddle.y -= 6;
    if (keys["ArrowDown"] && rightPaddle.y < canvas.height - paddleHeight) rightPaddle.y += 6;
  }

  function updateBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Bóng chạm trên/dưới
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) ball.dy *= -1;

    // Bóng chạm paddle trái
    if (
      ball.x - ball.radius < leftPaddle.x + paddleWidth &&
      ball.y > leftPaddle.y &&
      ball.y < leftPaddle.y + paddleHeight
    ) {
      ball.dx *= -1;
      ball.x = leftPaddle.x + paddleWidth + ball.radius; // tránh kẹt
    }

    // Bóng chạm paddle phải
    if (
      ball.x + ball.radius > rightPaddle.x &&
      ball.y > rightPaddle.y &&
      ball.y < rightPaddle.y + paddleHeight
    ) {
      ball.dx *= -1;
      ball.x = rightPaddle.x - ball.radius; // tránh kẹt
    }

    // Bóng ra ngoài (ghi điểm, reset)
    if (ball.x < 0 || ball.x > canvas.width) resetBall();
  }

  function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx *= -1;
    ball.dy = 3 * (Math.random() > 0.5 ? 1 : -1);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";

    // Bóng
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Paddle trái
    ctx.fillRect(leftPaddle.x, leftPaddle.y, paddleWidth, paddleHeight);

    // Paddle phải
    ctx.fillRect(rightPaddle.x, rightPaddle.y, paddleWidth, paddleHeight);
  }

  function gameLoop() {
    if (!running) return;
    movePaddles();
    updateBall();
    draw();
    requestAnimationFrame(gameLoop);
  }

  gameLoop();
}
