const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// RENDER sử dụng process.env.PORT
const PORT = process.env.PORT || 3000; 

app.use(express.static(path.join(__dirname, '..', 'public')));

// =========================================================================
// THIẾT LẬP VÀ BIẾN TOÀN CỤC
// =========================================================================

// ĐÃ TĂNG TỐC ĐỘ THANH TRƯỢT (paddleSpeed) LÊN THÊM 2 ĐƠN VỊ
const DIFFICULTY_SETTINGS = {
    // Thanh trượt RẤT nhạy (paddleSpeed), Tốc độ bóng ổn định (ballSpeed)
    easy: { ballSpeed: 2, paddleSpeed: 15, scoreLimit: 5 }, 
    medium: { ballSpeed: 3, paddleSpeed: 15, scoreLimit: 7 }, 
    hard: { ballSpeed: 4, paddleSpeed: 15, scoreLimit: 10 } 
};

let rooms = {};
let waitingRoomId = null; 

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
        originalBallSpeed: settings.ballSpeed, 
        readyToRestart: { player1: false, player2: false }, 
        colorIndex: 0,
        interval: null 
    };
}

function resetBall(room) {
    room.ballX = CANVAS_WIDTH / 2;
    room.ballY = CANVAS_HEIGHT / 2;
    
    // Sử dụng tốc độ bóng ban đầu để đảm bảo tốc độ ổn định
    const speedMagnitude = room.originalBallSpeed; 

    // Đảo hướng sau khi ghi điểm
    room.ballDX = (room.ballDX > 0 ? -1 : 1) * speedMagnitude;
    room.ballDY = speedMagnitude * (Math.random() > 0.5 ? 1 : -1);
}

function startGame(room) {
    resetBall(room);
    room.score = { player1: 0, player2: 0 };
    room.isGameOver = false;
    room.isGameRunning = true;
    room.readyToRestart = { player1: false, player2: false }; 
    room.colorIndex = 0; 
    io.to(room.id).emit('gameStart', room); 
    if (!room.interval) {
        room.interval = setInterval(() => gameLoop(room), 1000 / 60); 
    }
}

function gameLoop(room) {
    if (!room.isGameRunning) return;

    // 1. Di chuyển bóng
    room.ballX += room.ballDX;
    room.ballY += room.ballDY;

    // 2. Va chạm trên/dưới
    if (room.ballY < 0 || room.ballY > CANVAS_HEIGHT) {
        room.ballDY *= -1;
    }

    // 3. Va chạm với Player 1 (Trái)
    if (room.ballX <= PADDLE_WIDTH && 
        room.ballY >= room.player1Y && 
        room.ballY <= room.player1Y + PADDLE_HEIGHT) {
        
        room.ballDX *= -1; 
        room.ballX = PADDLE_WIDTH + 1; 
        
        let relativeIntersectY = (room.player1Y + (PADDLE_HEIGHT / 2)) - room.ballY;
        let normalizedRelativeIntersectionY = (relativeIntersectY / (PADDLE_HEIGHT / 2));
        room.ballDY = normalizedRelativeIntersectionY * Math.abs(room.ballDX); 
        
        room.colorIndex = (room.colorIndex + 1) % 7; 
    }

    // 4. Va chạm với Player 2 (Phải)
    if (room.ballX >= CANVAS_WIDTH - PADDLE_WIDTH && 
        room.ballY >= room.player2Y && 
        room.ballY <= room.player2Y + PADDLE_HEIGHT) {
        
        room.ballDX *= -1; 
        room.ballX = CANVAS_WIDTH - PADDLE_WIDTH - 1; 

        let relativeIntersectY = (room.player2Y + (PADDLE_HEIGHT / 2)) - room.ballY;
        let normalizedRelativeIntersectionY = (relativeIntersectY / (PADDLE_HEIGHT / 2));
        room.ballDY = normalizedRelativeIntersectionY * Math.abs(room.ballDX); 

        room.colorIndex = (room.colorIndex + 1) % 7; 
    }
    
    // 5. Ghi điểm
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

        if (roomId === 'RANDOM_MATCH') {
            if (waitingRoomId && rooms[waitingRoomId] && rooms[waitingRoomId].playerCount === 1) {
                roomId = waitingRoomId;
                waitingRoomId = null; 
            } else {
                roomId = Math.floor(100000 + Math.random() * 900000).toString();
                waitingRoomId = roomId; 
            }
        }

        if (rooms[roomId] && rooms[roomId].playerCount >= 2) {
            socket.emit('roomFull');
            if (roomId === waitingRoomId) {
                waitingRoomId = null;
            }
            return;
        }

        if (!rooms[roomId]) {
            rooms[roomId] = createGameState(roomId, settings);
        }

        currentRoomId = roomId;
        socket.join(roomId);
        
        const room = rooms[roomId];
        room.playerCount++;

        if (room.playerCount === 1) {
            room.player1 = socket.id;
            socket.emit('playerAssignment', { player: 1, roomId: roomId });
            io.to(roomId).emit('serverMessage', { message: `Phòng ID: ${roomId}. Đang chờ đối thủ...` });

        } else if (room.playerCount === 2) {
            room.player2 = socket.id;
            
            if (!room.isGameOver) { 
                 room.isGameRunning = true; 
                 io.to(roomId).emit('gameStart', room); 
                 if (!room.interval) {
                    room.interval = setInterval(() => gameLoop(room), 1000 / 60); 
                 }
            } else {
                 io.to(roomId).emit('gameState', room); 
            }
            
            socket.emit('playerAssignment', { player: 2, roomId: roomId });
            
            if (roomId === waitingRoomId) {
                waitingRoomId = null;
            }
        }
    });

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

    // LOGIC CHƠI LẠI (SẴN SÀNG)
    socket.on('playerReady', () => {
        if (!currentRoomId || !rooms[currentRoomId]) return;

        const room = rooms[currentRoomId];

        if (room.isGameOver && room.playerCount === 2) {
            let player = null;
            if (socket.id === room.player1) {
                room.readyToRestart.player1 = true;
                player = 1;
            } else if (socket.id === room.player2) {
                room.readyToRestart.player2 = true;
                player = 2;
            }
            
            if (room.readyToRestart.player1 && room.readyToRestart.player2) {
                startGame(room);
            } else if (player) {
                // Gửi thông báo cho người chơi vừa nhấn
                io.to(socket.id).emit('serverMessage', { message: "Bạn đã sẵn sàng. Đang chờ đối thủ..." });
                
                // Gửi thông báo cho người chơi còn lại
                const otherPlayerId = (player === 1) ? room.player2 : room.player1;
                io.to(otherPlayerId).emit('serverMessage', { message: "Đối thủ đã sẵn sàng. Nhấn SPACE để tham gia trận mới!" });
            }
        }
    });
    
    socket.on('disconnect', () => {
        if (!currentRoomId || !rooms[currentRoomId]) return;

        const room = rooms[currentRoomId];
        room.playerCount--;

        if (room.playerCount <= 0) {
            clearInterval(room.interval);
            delete rooms[currentRoomId];
            if (currentRoomId === waitingRoomId) {
                waitingRoomId = null;
            }
        } else if (room.playerCount === 1) {
            room.isGameRunning = false;
            room.isGameOver = true; 
            
            // Đặt lại trạng thái phòng và gán lại Player 1
            const remainingPlayerId = (socket.id === room.player1) ? room.player2 : room.player1;
            
            room.player1 = remainingPlayerId;
            room.player2 = null; 
            room.readyToRestart = { player1: false, player2: false };
            
            io.to(remainingPlayerId).emit('serverMessage', { message: "Đối thủ đã rời phòng. Đang chờ người chơi mới..." });
        }
    });
});

// Khởi động Server
server.listen(PORT, () => {
    console.log(`Server đang chạy trên http://localhost:${PORT}`);
});