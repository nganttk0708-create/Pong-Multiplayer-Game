const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let playerNumber = 0;
let paddle = { x: 400, y: 470, w: 100, h: 10 };
let opponent = { x: 400, y: 20, w: 100, h: 10 };
let ball = { x: 450, y: 250, dx: 4, dy: 4, r: 10 };
let running = false;

document.getElementById('startBtn').onclick = () => {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('gameContainer').style.display = 'block';
};

socket.on('playerNumber', (num) => {
  playerNumber = num;
  document.getElementById('statusText').textContent = `Bạn là người chơi ${num}`;
});

socket.on('startGame', () => {
  running = true;
  gameLoop();
  document.getElementById('statusText').textContent = "Trận đấu bắt đầu!";
});

socket.on('roomFull', () => {
  alert("Phòng đã đầy! Vui lòng thử lại sau.");
});

socket.on('paddleMove', (data) => {
  if (playerNumber === 1) opponent.x = data.x;
  else paddle.x = data.x;
});

socket.on('playerLeft', () => {
  document.getElementById('statusText').textContent = "Người chơi kia đã thoát!";
  running = false;
});

socket.on('gameEnded', (data) => {
  document.getElementById('statusText').textContent = "Trận đấu đã kết thúc!";
  running = false;
});

function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawBall(x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.closePath();
}

function movePaddle(e) {
  const rect = canvas.getBoundingClientRect();
  paddle.x = e.clientX - rect.left - paddle.w / 2;
  socket.emit('paddleMove', { x: paddle.x });
}

canvas.addEventListener('mousemove', movePaddle);

function moveBall() {
  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.x < ball.r || ball.x > canvas.width - ball.r) ball.dx *= -1;
  if (ball.y < ball.r || ball.y > canvas.height - ball.r) ball.dy *= -1;

  // Va chạm với thanh
  if (ball.y + ball.r > paddle.y &&
      ball.x > paddle.x && ball.x < paddle.x + paddle.w) ball.dy *= -1;

  if (ball.y - ball.r < opponent.y + opponent.h &&
      ball.x > opponent.x && ball.x < opponent.x + opponent.w) ball.dy *= -1;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRect(paddle.x, paddle.y, paddle.w, paddle.h, 'white');
  drawRect(opponent.x, opponent.y, opponent.w, opponent.h, 'gray');
  drawBall(ball.x, ball.y, ball.r, 'yellow');
}

function gameLoop() {
  if (!running) return;
  draw();
  moveBall();
  requestAnimationFrame(gameLoop);
}

document.getElementById('restartBtn').onclick = () => {
  ball = { x: 450, y: 250, dx: 4, dy: 4, r: 10 };
  running = true;
  gameLoop();
};

document.getElementById('exitBtn').onclick = () => {
  socket.emit('exitGame');
  running = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById('statusText').textContent = "Bạn đã thoát trận.";
};
