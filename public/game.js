const socket = io();

// =================== GIAO DIỆN ===================
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

// =================== GIAO DIỆN NÚT ===================
startBtn.onclick = () => {
  welcome.classList.add("hidden");
  menu.classList.remove("hidden");
};

exitBtn.onclick = () => {
  game.classList.add("hidden");
  menu.classList.remove("hidden");
};

restartBtn.onclick = () => startGame();

// =================== SOCKET ===================
randomBtn.onclick = () => socket.emit("playRandom");
createBtn.onclick = () => {
  socket.emit("createRoom");
  createSection.classList.remove("hidden");
};
joinToggle.onclick = () => joinSection.classList.toggle("hidden");
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

// =================== GAME LOGIC ===================
function startGame() {
  const paddleHeight = 100;
  const paddleWidth = 15;

  let leftPaddle = { x: 20, y: canvas.height / 2 - paddleHeight / 2 };
  let rightPaddle = { x: canvas.width - 35, y: canvas.height / 2 - paddleHeight / 2 };
  let ball = { x: canvas.width / 2, y: canvas.height / 2, dx: 3, dy: 3, radius: 10 };
  let leftScore = 0, rightScore = 0;
  let running = true;

  // 🎨 Màu sắc
  const bgColor = "white";      // Nền trắng
  const frameColor = "black";   // Khung đen
  const paddleColor = "red";    // Thanh đỏ
  const ballColor = "gold";     // Bóng vàng
  const lineColor = "#222";     // Đường giữa
  const textColor = "#222";     // Màu điểm số

  const keys = {};
  document.addEventListener("keydown", (e) => (keys[e.key] = true));
  document.addEventListener("keyup", (e) => (keys[e.key] = false));

  function movePaddles() {
    if (keys["w"] && leftPaddle.y > 0) leftPaddle.y -= 6;
    if (keys["s"] && leftPaddle.y < canvas.height - paddleHeight) leftPaddle.y += 6;
    if (keys["ArrowUp"] && rightPaddle.y > 0) rightPaddle.y -= 6;
    if (keys["ArrowDown"] && rightPaddle.y < canvas.height - paddleHeight) rightPaddle.y += 6;
  }

  function updateBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Va chạm tường trên / dưới
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height)
      ball.dy *= -1;

    // Va chạm thanh trái
    if (
      ball.x - ball.radius < leftPaddle.x + paddleWidth &&
      ball.y > leftPaddle.y &&
      ball.y < leftPaddle.y + paddleHeight
    ) {
      ball.dx *= -1;
      ball.x = leftPaddle.x + paddleWidth + ball.radius;
    }

    // Va chạm thanh phải
    if (
      ball.x + ball.radius > rightPaddle.x &&
      ball.y > rightPaddle.y &&
      ball.y < rightPaddle.y + paddleHeight
    ) {
      ball.dx *= -1;
      ball.x = rightPaddle.x - ball.radius;
    }

    // Ghi điểm
    if (ball.x < 0) { rightScore++; resetBall(); }
    if (ball.x > canvas.width) { leftScore++; resetBall(); }
  }

  function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = 3 * (Math.random() > 0.5 ? 1 : -1);
    ball.dy = 3 * (Math.random() > 0.5 ? 1 : -1);
  }

  function drawMiddleLine() {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawScore() {
    ctx.fillStyle = textColor;
    ctx.font = "30px Arial";
    ctx.fillText(leftScore, canvas.width / 2 - 50, 40);
    ctx.fillText(rightScore, canvas.width / 2 + 30, 40);
  }

  function draw() {
    // Nền và khung
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Đường giữa & điểm số
    drawMiddleLine();
    drawScore();

    // Hai thanh
    ctx.fillStyle = paddleColor;
    ctx.fillRect(leftPaddle.x, leftPaddle.y, paddleWidth, paddleHeight);
    ctx.fillRect(rightPaddle.x, rightPaddle.y, paddleWidth, paddleHeight);

    // Bóng
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ballColor;
    ctx.fill();
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
