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

let playerNumber = null;
let gameState = null;
let keys = {}; 
const PADDLE_HEIGHT = 80;
const RAINBOW_COLORS = [
    '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'
];

// =========================================================================
// XỬ LÝ SỰ KIỆN LOBBY (JOIN ROOM / RANDOM MATCH)
// =========================================================================

// --- Logic Tham gia Phòng Riêng ---
joinButton.addEventListener('click', () => {
    const roomId = roomIdInput.value.trim();
    const difficulty = difficultySelect.value;
    
    if (roomId) {
        lobbyDiv.style.display = 'none'; 
        gameContainerDiv.style.display = 'block'; 
        msgDiv.style.display = 'block'; 
        msgDiv.textContent = 'Đang cố gắng tham gia phòng...';
        
        socket.emit('joinRoom', { roomId: roomId, difficulty: difficulty });
    } else {
        alert('Vui lòng nhập ID Phòng.');
    }
});

// --- Logic Tìm Trận Ngẫu Nhiên ---
randomButton.addEventListener('click', () => {
    const difficulty = difficultySelect.value;
    
    lobbyDiv.style.display = 'none'; 
    gameContainerDiv.style.display = 'block'; 
    msgDiv.style.display = 'block'; 
    msgDiv.textContent = 'Đang tìm kiếm trận đấu ngẫu nhiên...';

    socket.emit('joinRoom', { roomId: 'RANDOM_MATCH', difficulty: difficulty }); 
});

// =========================================================================
// XỬ LÝ SOCKET.IO VÀ GAME LOOP
// =========================================================================

socket.on('playerAssignment', (data) => {
    playerNumber = data.player;
    const playerText = (playerNumber === 1) ? "1 (Trái)" : "2 (Phải)";
    msgDiv.textContent = `Bạn là Người chơi ${playerText}. Phòng ID: ${data.roomId}. Đang chờ đối thủ...`;
});

socket.on('roomFull', () => {
    alert('Phòng đã đầy. Vui lòng chọn phòng khác.');
    lobbyDiv.style.display = 'block';
    gameContainerDiv.style.display = 'none';
});

socket.on('gameStart', (state) => {
    gameState = state;
    msgDiv.style.display = 'none';
    requestAnimationFrame(gameLoopClient);
});

socket.on('gameState', (state) => {
    gameState = state;
});

socket.on('serverMessage', (data) => {
    msgDiv.textContent = data.message;
    msgDiv.style.display = 'block';
});

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // SỬA: Gửi tín hiệu 'playerReady' khi nhấn SPACE và game over
    if (e.key === ' ' && gameState && gameState.isGameOver) {
        socket.emit('playerReady');
    }
});
document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

function gameLoopClient() {
    if (!gameState) return;

    updatePlayerMovement(); 

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGame(gameState);

    if (gameState.isGameOver) {
        // Kiểm tra xem cả hai đã sẵn sàng chưa để hiển thị thông báo chính xác
        let ready1 = gameState.readyToRestart.player1;
        let ready2 = gameState.readyToRestart.player2;
        
        const winner = gameState.score.player1 > gameState.score.player2 ? "NGƯỜI CHƠI 1" : "NGƯỜI CHƠI 2";
        
        if (ready1 && ready2) {
            // Trường hợp này không xảy ra vì game đã bắt đầu lại
        } else if (ready1 || ready2) {
             // Thông báo đang chờ người còn lại (sẽ được server gửi qua serverMessage)
        } else {
             // Thông báo chung
             msgDiv.textContent = `${winner} THẮNG! NHẤN SPACE để chơi lại`;
        }
        msgDiv.style.display = 'block';
    }

    requestAnimationFrame(gameLoopClient);
}

function updatePlayerMovement() {
    if (!playerNumber || !gameState) return;
    
    let currentY = (playerNumber === 1) ? gameState.player1Y : gameState.player2Y;
    let newY = currentY;
    const speed = gameState.paddleSpeed; 

    if (playerNumber === 1) { 
        if (keys['w'] || keys['W']) newY -= speed;
        if (keys['s'] || keys['S']) newY += speed;
    } else if (playerNumber === 2) { 
        if (keys['ArrowUp']) newY -= speed;
        if (keys['ArrowDown']) newY += speed;
    }

    if (newY < 0) newY = 0;
    if (newY > canvas.height - PADDLE_HEIGHT) newY = canvas.height - PADDLE_HEIGHT;

    if (newY !== currentY) {
        socket.emit('move', { y: newY });
    }
}

function drawGame(state) {
    const color = RAINBOW_COLORS[state.colorIndex];
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    ctx.setLineDash([5, 10]);
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillRect(0, state.player1Y, 10, PADDLE_HEIGHT);
    ctx.fillRect(canvas.width - 10, state.player2Y, 10, PADDLE_HEIGHT);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(state.ballX, state.ballY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(state.score.player1, canvas.width / 4, 60);
    ctx.fillText(state.score.player2, (canvas.width / 4) * 3, 60);
}