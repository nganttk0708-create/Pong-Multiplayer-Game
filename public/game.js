// public/game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const msgDiv = document.getElementById('message'); 
const lobbyDiv = document.getElementById('lobby');
const joinButton = document.getElementById('joinButton');
const roomIdInput = document.getElementById('roomIdInput');
const difficultySelect = document.getElementById('difficultySelect');

// --- Kết nối đến Server Node.js ---
const socket = io(); 

// --- Cài đặt Chung ---
const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 8;

// Mảng 7 màu cầu vồng 
const RAINBOW_COLORS = [
    '#FF0000', '#FFA500', '#FFFF00', '#00FF00', '#00BFFF', '#4B0082', '#9400D3'
];

let playerNum = null; 
let isP1 = false; 
let gameState = null; 
let currentSettings = null; 

// ==========================================================
// HÀM TẠO ID NGẪU NHIÊN 6 CHỮ SỐ
// ==========================================================
function generateRandomRoomId() {
    // Tạo số ngẫu nhiên từ 100000 đến 999999
    const min = 100000;
    const max = 999999;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Gán ID ngẫu nhiên cho ô nhập liệu ngay khi script được tải
roomIdInput.value = generateRandomRoomId();

// ==========================================================
// I. XỬ LÝ LOBBY
// ==========================================================

joinButton.addEventListener('click', () => {
    const roomId = roomIdInput.value.trim();
    const difficulty = difficultySelect.value;

    if (roomId) {
        lobbyDiv.style.display = 'none'; 
        msgDiv.style.display = 'block'; 
        msgDiv.textContent = 'Đang cố gắng tham gia phòng...';
        
        socket.emit('joinRoom', { roomId, difficulty });
    } else {
        alert('Vui lòng nhập ID Phòng.');
    }
});


// ==========================================================
// II. SOCKET.IO VÀ CẬP NHẬT TRẠNG THÁI TỪ SERVER
// ==========================================================

socket.on('roomError', (message) => {
    lobbyDiv.style.display = 'block';
    msgDiv.style.display = 'none'; 
    alert(message);
});

socket.on('waiting', (message) => {
    msgDiv.textContent = message;
    msgDiv.style.display = 'block'; 
    canvas.style.display = 'block'; 
});

socket.on('playerAssignment', (data) => {
    playerNum = data.playerNum;
    isP1 = data.isP1;
    currentSettings = data.settings; 
    msgDiv.textContent = `Bạn là người chơi ${playerNum}. Đang chờ người chơi 2...`;
    msgDiv.style.display = 'block'; 
    canvas.style.display = 'block'; 
});

socket.on('gameStart', () => {
    msgDiv.style.display = 'none'; 
});

socket.on('gameState', (state) => {
    gameState = state;
    if (gameState && !gameState.isGameOver) {
        msgDiv.style.display = 'none'; 
    }
    draw(); 
});

socket.on('playerDisconnected', (message) => {
    msgDiv.textContent = message;
    msgDiv.style.display = 'block';
});

// ==========================================================
// III. HÀM VẼ (DRAWING FUNCTIONS)
// ==========================================================

function drawText(text, x, y, size, color) {
    ctx.font = `bold ${size}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

function draw() {
    if (!gameState || !currentSettings) return; 

    const PADDLE_HEIGHT = currentSettings.PADDLE_HEIGHT;
    const currentColor = RAINBOW_COLORS[gameState.colorIndex];

    canvas.style.borderColor = currentColor; 
    canvas.style.boxShadow = `0 0 20px ${currentColor}`; 

    ctx.fillStyle = '#000000'; 
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = currentColor;
    ctx.strokeStyle = currentColor;
    ctx.shadowBlur = 10;
    ctx.shadowColor = currentColor;

    ctx.beginPath();
    ctx.setLineDash([10, 5]);
    ctx.lineWidth = 2;
    ctx.moveTo(GAME_WIDTH / 2, 0);
    ctx.lineTo(GAME_WIDTH / 2, GAME_HEIGHT);
    ctx.stroke();

    ctx.shadowBlur = 0; 
    ctx.shadowColor = 'transparent';
    
    drawText(gameState.score.player1, GAME_WIDTH / 4, 60, 60, '#FFFFFF'); 
    drawText(gameState.score.player2, GAME_WIDTH * 3 / 4, 60, 60, '#FFFFFF'); 
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = currentColor;

    for (const pID in gameState.players) {
        const p = gameState.players[pID];
        ctx.fillRect(p.x, p.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    }
    
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, BALL_SIZE, 0, Math.PI * 2); 
    ctx.shadowBlur = 15; 
    ctx.fill();
    ctx.closePath();
    
    if (gameState.isGameOver) {
        msgDiv.style.display = 'block';
        if (gameState.score.player1 > gameState.score.player2) {
            msgDiv.textContent = 'NGƯỜI CHƠI 1 THẮNG! (Nhấn SPACE để chơi lại)';
        } else {
            msgDiv.textContent = 'NGƯỜI CHƠI 2 THẮNG! (Nhấn SPACE để chơi lại)';
        }
    }
}

// ==========================================================
// IV. XỬ LÝ PHÍM (GỬI TÍN HIỆU CHO SERVER)
// ==========================================================

function handleMove(direction) {
    if (!gameState || gameState.isGameOver) {
        if (event.key === ' ' || event.key === 'Spacebar') {
            socket.emit('restartGame'); 
        }
        return;
    }
    socket.emit('paddleMove', { direction: direction });
}

document.addEventListener('keydown', (e) => {
    if (!gameState) return;

    if (isP1) {
        if (e.key === 'w' || e.key === 'W') handleMove(-1);
        else if (e.key === 's' || e.key === 'S') handleMove(1);
    } else { 
        if (e.key === 'ArrowUp') handleMove(-1);
        else if (e.key === 'ArrowDown') handleMove(1);
    }

    if (e.key === ' ' || e.key === 'Spacebar') {
        if (gameState.isGameOver) {
            socket.emit('restartGame');
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (!gameState) return;

    if (isP1) {
        if (e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S') handleMove(0);
    } else {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') handleMove(0);
    }
});