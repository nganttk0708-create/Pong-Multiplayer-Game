const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// RENDER sử dụng process.env.PORT, KHÔNG phải 3000
const PORT = process.env.PORT || 3000; 

app.use(express.static(path.join(__dirname, '..', 'public')));

// =========================================================================
// THIẾT LẬP VÀ BIẾN TOÀN CỤC
// =========================================================================

const DIFFICULTY_SETTINGS = {
    easy: { ballSpeed: 4, paddleSpeed: 5, scoreLimit: 5 },
    medium: { ballSpeed: 6, paddleSpeed: 7, scoreLimit: 7 },
    hard: { ballSpeed: 8, paddleSpeed: 9, scoreLimit: 10 }
};

let rooms = {};
let waitingRoomId = null; // ID của phòng đang chờ người chơi ngẫu nhiên thứ 2 (Player 1)

const PADDLE_HEIGHT = 80;
const PADDLE_WIDTH = 10;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

function createGameState(roomId, settings) {
    return {
        id: roomId,
        playerCount: 0,
        player1: null,
        player2: null,
        player1Y: (CANVAS_HEIGHT / 2) - (PADDLE_HEIGHT / 2),
        player2Y: (CANVAS_HEIGHT / 2) - (PADDLE_HEIGHT / 2),
        ballX: CANVAS_WIDTH / 2,
        ballY: CANVAS_HEIGHT / 2,
        ballDX: settings.ballSpeed, 
        ballDY: settings.ballSpeed,
        score: { player1: 0, player2: 0 },
        isGameRunning: false,
        isGameOver: false,
        scoreLimit: settings.scoreLimit, 
        paddleSpeed: settings.paddleSpeed, 
        colorIndex: 0
    };
}

function resetBall(room) {
    room.ballX = CANVAS_WIDTH / 2;
    room.ballY = CANVAS_HEIGHT / 2;
    room.ballDX = (room.ballDX > 0 ? -1 : 1) * rooms[room.id].paddleSpeed;
    room.ballDY = rooms[room.id].paddleSpeed * (Math.random() > 0.5 ? 1 : -1);
}

function gameLoop(room) {
    if (!room.isGameRunning) return;

    // ... (Toàn bộ logic di chuyển, va chạm, và ghi điểm) ...
    room.ballX += room.ballDX;
    room.ballY += room.ballDY;

    // Va chạm trên/dưới
    if (room.ballY < 0 || room.ballY > CANVAS_HEIGHT) {
        room.ballDY *= -1;
    }

    // Va chạm với Player 1 (Thanh trượt bên trái)
    if (room.ballX <= PADDLE_WIDTH && 
        room.ballY >= room.player1Y && 
        room.ballY <= room.player1Y + PADDLE_HEIGHT) {
        
        room.ballDX *= -1.1;
        room.ballX = PADDLE_WIDTH + 1;
        let relativeIntersectY = (room.player1Y + (PADDLE_HEIGHT / 2)) - room.ballY;
        let normalizedRelativeIntersectionY = (relativeIntersectY / (PADDLE_HEIGHT / 2));
        room.ballDY = normalizedRelativeIntersectionY * room.paddleSpeed;
        
        room.colorIndex = (room.colorIndex + 1) % 7;
    }

    // Va chạm với Player 2 (Thanh trượt bên phải)
    if (room.ballX >= CANVAS_WIDTH - PADDLE_WIDTH && 
        room.ballY >= room.player2Y && 
        room.ballY <= room.player2Y + PADDLE_HEIGHT) {
        
        room.ballDX *= -1.1; 
        room.ballX = CANVAS_WIDTH - PADDLE_WIDTH - 1; 
        let relativeIntersectY = (room.player2Y + (PADDLE_HEIGHT / 2)) - room.ballY;
        let normalizedRelativeIntersectionY = (relativeIntersectY / (PADDLE_HEIGHT / 2));
        room.ballDY = normalizedRelativeIntersectionY * room.paddleSpeed; 

        room.colorIndex = (room.colorIndex + 1) % 7; 
    }
    
    // Ghi điểm
    let scored = false;
    if (room.ballX < 0) {
        room.score.player2++;
        scored = true;
    } else if (room.ballX > CANVAS_WIDTH) {
        room.score.player1++;
        scored = true;
    }

    if(scored) {
        resetBall(room);
        if (room.score.player1 >= room.scoreLimit || room.score.player2 >= room.scoreLimit) {
            room.isGameOver = true;
            room.isGameRunning = false;
        }
    }

    io.to(room.id).emit('gameState', room);
}

// =========================================================================
// XỬ LÝ KẾT NỐI SOCKET.IO
// =========================================================================

io.on('connection', (socket) => {
    let currentRoomId = null;

    socket.on('joinRoom', (data) => {
        let roomId = data.roomId.trim();
        const difficulty = data.difficulty || 'medium'; 
        const settings = DIFFICULTY_SETTINGS[difficulty];

        // --- LOGIC GHÉP TRẬN NGẪU NHIÊN ---
        if (roomId === 'RANDOM_MATCH') {
            if (waitingRoomId && rooms[waitingRoomId] && rooms[waitingRoomId].playerCount === 1) {
                // Có phòng chờ: Tham gia phòng đó
                roomId = waitingRoomId;
                waitingRoomId = null; 
            } else {
                // Không có phòng chờ: Tạo ID ngẫu nhiên và chuyển thành phòng chờ mới
                roomId = Math.floor(100000 + Math.random() * 900000).toString();
                waitingRoomId = roomId; 
            }
        }
        // ----------------------------------------

        // 1. Kiểm tra giới hạn phòng
        if (rooms[roomId] && rooms[roomId].playerCount >= 2) {
            socket.emit('roomFull');
            if (roomId === waitingRoomId) {
                waitingRoomId = null;
            }
            return;
        }

        // 2. Khởi tạo phòng nếu là phòng mới
        if (!rooms[roomId]) {
            rooms[roomId] = createGameState(roomId, settings);
        }

        // 3. Tham gia phòng
        currentRoomId = roomId;
        socket.join(roomId);
        
        const room = rooms[roomId];
        room.playerCount++;

        // 4. Gán người chơi
        if (room.playerCount === 1) {
            room.player1 = socket.id;
            socket.emit('playerAssignment', { player: 1, roomId: roomId });
            io.to(roomId).emit('serverMessage', { message: `Phòng ID: ${roomId}. Đang chờ đối thủ...` });

        } else if (room.playerCount === 2) {
            room.player2 = socket.id;
            room.isGameRunning = true; // Bắt đầu game
            io.to(roomId).emit('playerAssignment', { player: (socket.id === room.player1 ? 1 : 2), roomId: roomId });
            io.to(roomId).emit('gameStart', room);
            
            if (roomId === waitingRoomId) {
                waitingRoomId = null;
            }
            
            // Khởi động Game Loop chỉ 1 lần cho phòng
            if (!room.interval) {
                room.interval = setInterval(() => gameLoop(room), 1000 / 60); 
            }
        }
    });

    // ... (Logic move giữ nguyên) ...
    socket.on('move', (data) => {
        if (!currentRoomId || !rooms[currentRoomId] || rooms[currentRoomId].isGameOver) return;
        
        const room = rooms[currentRoomId];
        let newY = data.y;
        
        if (newY < 0) newY = 0;
        if (newY > CANVAS_HEIGHT - PADDLE_HEIGHT) newY = CANVAS_HEIGHT - PADDLE_HEIGHT;

        if (socket.id === room.player1) {
            room.player1Y = newY;
        } else if (socket.id === room.player2) {
            room.player2Y = newY;
        }
    });

    // --- Chơi lại game (Restart Game) ---
    socket.on('restartGame', () => {
        if (!currentRoomId || !rooms[currentRoomId]) return;

        const room = rooms[currentRoomId];
        
        if (room.isGameOver && room.playerCount === 2) { 
            resetBall(room);
            room.score = { player1: 0, player2: 0 };
            room.isGameOver = false;
            room.isGameRunning = true;
            room.colorIndex = 0; 
            io.to(currentRoomId).emit('gameState', room);
        }
    });

    // --- Ngắt kết nối (Disconnection) ---
    socket.on('disconnect', () => {
        if (!currentRoomId || !rooms[currentRoomId]) return;

        const room = rooms[currentRoomId];
        room.playerCount--;

        if (room.playerCount <= 0) {
            clearInterval(room.interval); // Dừng game loop
            delete rooms[currentRoomId];
            if (currentRoomId === waitingRoomId) {
                waitingRoomId = null;
            }
        } else if (room.playerCount === 1) {
            room.isGameRunning = false;
            room.isGameOver = true; 
            
            // Gán lại ID người chơi còn lại
            room.player1 = (socket.id === room.player1) ? room.player2 : room.player1;
            room.player2 = null; 
            
            io.to(currentRoomId).emit('serverMessage', { message: "Đối thủ đã rời phòng. Đang chờ người chơi mới... (Nhấn SPACE để chơi lại khi có người)" });
        }
    });
});

// Khởi động Server
server.listen(PORT, () => {
    console.log(`Server đang chạy trên http://localhost:${PORT}`);
});