
const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const lobbyDiv = document.getElementById('lobby');
const gameContainerDiv = document.getElementById('game-container');
const msgDiv = document.getElementById('message');

const joinButton = document.getElementById('joinButton');
const randomButton = document.getElementById('randomButton');
const roomIdInput = document.getElementById('roomIdInput');
const difficultySelect = document.getElementById('difficultySelect');
const rematchButton = document.getElementById('rematchButton');
const exitButton = document.getElementById('exitButton');

let playerNumber = null;
let gameState = null;
const PADDLE_HEIGHT = 80;


joinButton.addEventListener('click', () => {
  const roomId = roomIdInput.value.trim();
  const difficulty = difficultySelect.value;

  if (roomId) {
    lobbyDiv.style.display = 'none';
    gameContainerDiv.style.display = 'block';
    msgDiv.textContent = 'Đang cố gắng tham gia phòng...';
    socket.emit('joinRoom', { roomId, difficulty });
  } else {
    alert('Vui lòng nhập ID Phòng.');
  }
});

randomButton.addEventListener('click', () => {
  const difficulty = difficultySelect.value;
  lobbyDiv.style.display = 'none';
  gameContainerDiv.style.display = 'block';
  msgDiv.textContent = 'Đang tìm kiếm trận đấu ngẫu nhiên...';
  socket.emit('joinRoom', { roomId: 'RANDOM_MATCH', difficulty });
});


socket.on('playerAssignment', (data) => {
  playerNumber = data.player;
  const text = (playerNumber === 1) ? "1 (Trái)" : "2 (Phải)";
  msgDiv.textContent = `Bạn là Người chơi ${text}. Phòng ID: ${data.roomId}.`;
});

socket.on('roomFull', () => {
  alert('Phòng đã đầy. Vui lòng chọn phòng khác.');
  lobbyDiv.style.display = 'block';
  gameContainerDiv.style.display = 'none';
});

socket.on('gameStart', (state) => {
  gameState = state;
  msgDiv.textContent = '';
  requestAnimationFrame(gameLoopClient);
});

socket.on('gameState', (state) => {
  gameState = state;
});

socket.on('serverMessage', (data) => {
  msgDiv.textContent = data.message;
});


const pressed = new Set();

function isMoveKey(k) {
  return ['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S'].includes(k);
}

document.addEventListener('keydown', (e) => {
  if (isMoveKey(e.key) || e.key === ' ') e.preventDefault();
  pressed.add(e.key);

  if (e.key === ' ' && gameState && gameState.isGameOver) {
    socket.emit('restartGame');
  }
}, { passive: false });

document.addEventListener('keyup', (e) => {
  if (isMoveKey(e.key)) e.preventDefault();
  pressed.delete(e.key);
}, { passive: false });


function updatePlayerMovement() {
  if (!playerNumber || !gameState) return;

  let currentY = (playerNumber === 1) ? gameState.player1Y : gameState.player2Y;
  let newY = currentY;
  const speed = gameState.paddleSpeed;

  const upPressed = pressed.has('ArrowUp') || pressed.has('w') || pressed.has('W');
  const downPressed = pressed.has('ArrowDown') || pressed.has('s') || pressed.has('S');

  if (upPressed) newY -= speed;
  if (downPressed) newY += speed;

  if (newY < 0) newY = 0;
  if (newY > canvas.height - PADDLE_HEIGHT) newY = canvas.height - PADDLE_HEIGHT;

  if (newY !== currentY) {
    socket.emit('move', { y: newY });
  }
}

function gameLoopClient() {
  if (!gameState) return;

  updatePlayerMovement();

  // NỀN trắng
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGame(gameState);

  if (gameState.isGameOver) {
    msgDiv.textContent = "🏆 Trò chơi kết thúc! Nhấn SPACE để tái đấu";
  }

  requestAnimationFrame(gameLoopClient);
}

function drawGame(state) {
  // Khung đen viền 4px
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

  // Đường giữa: chấm trắng đen
  ctx.setLineDash([8, 12]);
  ctx.strokeStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Thanh trượt đỏ
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(0, state.player1Y, 10, PADDLE_HEIGHT);
  ctx.fillRect(canvas.width - 10, state.player2Y, 10, PADDLE_HEIGHT);

  // Bóng vàng
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(state.ballX, state.ballY, 7, 0, Math.PI * 2);
  ctx.fill();

  // Điểm số
  ctx.fillStyle = '#000';
  ctx.font = 'bold 40px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(state.score.player1, canvas.width / 4, 50);
  ctx.fillText(state.score.player2, (canvas.width / 4) * 3, 50);
}


rematchButton.addEventListener('click', () => {
  socket.emit('restartGame');
});

exitButton.addEventListener('click', () => {
  if (confirm('Bạn có chắc muốn thoát không?')) {
    gameContainerDiv.style.display = 'none';
    lobbyDiv.style.display = 'block';
    msgDiv.textContent = '';
    playerNumber = null;
    gameState = null;
  }
});
