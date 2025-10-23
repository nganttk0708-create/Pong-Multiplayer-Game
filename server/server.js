// server/server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// --- 1. CÀI ĐẶT CẤU HÌNH ĐỘ KHÓ ---
const GAME_WIDTH = 600;
const GAME_HEIGHT = 400;

// Các thông số game phụ thuộc vào độ khó
const DIFFICULTY_SETTINGS = {
    easy: {
        PADDLE_HEIGHT: 80, 
        BALL_SPEED_START: 3,
        BALL_SPEED_INCREMENT: 1.03 
    },
    medium: {
        PADDLE_HEIGHT: 60,
        BALL_SPEED_START: 4,
        BALL_SPEED_INCREMENT: 1.05 
    },
    hard: {
        PADDLE_HEIGHT: 40, 
        BALL_SPEED_START: 5, 
        BALL_SPEED_INCREMENT: 1.1 
    }
};

// --- 2. TRẠNG THÁI SERVER QUẢN LÝ NHIỀU PHÒNG ---
const MAX_SCORE = 5;
const RAINBOW_COLOR_COUNT = 7; 
const PADDLE_WIDTH = 10;
const PADDLE_SPEED = 5;
const BALL_SIZE = 8;

// rooms: { '123456': { playerIDs: {...}, state: {...}, ... } }
let rooms = {};

// Hàm tạo trạng thái game mới cho một phòng
function createGameState(roomId, settings) {
    
    // Tự động điều chỉnh vị trí Paddle theo độ cao mới
    const PADDLE_HEIGHT = settings.PADDLE_HEIGHT;
    const PADDLE_POSITIONS_MAP = {
        1: { x: 10, y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2, dy: 0, number: 1 },
        2: { x: GAME_WIDTH - PADDLE_WIDTH - 10, y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2, dy: 0, number: 2 }
    };
    
    return {
        id: roomId,
        settings: settings,
        players: {},
        playerCount: 0,
        playerIDs: PADDLE_POSITIONS_MAP, // Lưu vị trí/số người chơi
        ball: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, dx: 0, dy: 0 },
        score: { player1: 0, player2: 0 },
        colorIndex: 0,
        isGameOver: false,
        gameInterval: null 
    };
}

// Hàm reset bóng
function resetBall(gameState) {
    gameState.ball.x = GAME_WIDTH / 2;
    gameState.ball.y = GAME_HEIGHT / 2;
    const initialDirection = (Math.random() > 0.5 ? 1 : -1);
    gameState.ball.dx = initialDirection * (gameState.settings.BALL_SPEED_START + Math.random() * 1); 
    gameState.ball.dy = (Math.random() * 8) - 4; 
}

// Hàm cập nhật logic game
function updateGame(gameState) {
    if (gameState.isGameOver) return; 

    const PADDLE_HEIGHT = gameState.settings.PADDLE_HEIGHT;
    const SPEED_INC = gameState.settings.BALL_SPEED_INCREMENT;

    // Cập nhật vị trí Paddles
    for (const id in gameState.players) {
        const p = gameState.players[id];
        p.y = Math.max(0, Math.min(p.y + p.dy, GAME_HEIGHT - PADDLE_HEIGHT));
    }

    // Cập nhật vị trí bóng
    gameState.ball.x += gameState.ball.dx;
    gameState.ball.y += gameState.ball.dy;

    // Va chạm Tường trên/dưới
    if (gameState.ball.y + BALL_SIZE > GAME_HEIGHT || gameState.ball.y - BALL_SIZE < 0) {
        gameState.ball.dy = -gameState.ball.dy;
    }

    // Va chạm Paddle (GIỮ BÓNG => ĐỔI MÀU)
    let hasCollided = false;
    for (const id in gameState.players) {
        const p = gameState.players[id];
        
        // Paddle 1 (trái)
        if (p.number === 1 && gameState.ball.dx < 0 && 
            gameState.ball.x - BALL_SIZE < p.x + PADDLE_WIDTH && 
            gameState.ball.y > p.y && gameState.ball.y < p.y + PADDLE_HEIGHT) {
            
            gameState.ball.dx = -(gameState.ball.dx * SPEED_INC); 
            gameState.ball.dy = (gameState.ball.y - (p.y + PADDLE_HEIGHT / 2)) * 0.2;
            hasCollided = true;
        } 
        // Paddle 2 (phải)
        else if (p.number === 2 && gameState.ball.dx > 0 && 
            gameState.ball.x + BALL_SIZE > p.x && 
            gameState.ball.y > p.y && gameState.ball.y < p.y + PADDLE_HEIGHT) {
            
            gameState.ball.dx = -(gameState.ball.dx * SPEED_INC); 
            gameState.ball.dy = (gameState.ball.y - (p.y + PADDLE_HEIGHT / 2)) * 0.2;
            hasCollided = true;
        }
    }

    // ĐỔI MÀU KHI GIỮ BÓNG
    if (hasCollided) {
        gameState.colorIndex = (gameState.colorIndex + 1) % RAINBOW_COLOR_COUNT;
    }


    // Logic GHI ĐIỂM và ĐỔI MÀU (MẤT BÓNG)
    let scored = false;
    if (gameState.ball.x - BALL_SIZE < 0) { // Bóng chạm biên trái => P2 ghi điểm
        gameState.score.player2++;
        scored = true;
    } else if (gameState.ball.x + BALL_SIZE > GAME_WIDTH) { // Bóng chạm biên phải => P1 ghi điểm
        gameState.score.player1++;
        scored = true;
    }

    if (scored) {
        gameState.colorIndex = (gameState.colorIndex + 1) % RAINBOW_COLOR_COUNT; // ĐỔI MÀU KHI GHI ĐIỂM
        resetBall(gameState);
    }
    
    // Kiểm tra Game Over
    if (gameState.score.player1 >= MAX_SCORE || gameState.score.player2 >= MAX_SCORE) {
        gameState.isGameOver = true;
    }
}

// --- 3. KẾT NỐI SOCKET.IO VÀ QUẢN LÝ PHÒNG ---
io.on('connection', (socket) => {
    let currentRoomId = null;
    let currentPlayerNum = null;
    
    // Xử lý sự kiện khi Client muốn tham gia phòng
    socket.on('joinRoom', (data) => {
        const roomId = data.roomId;
        const difficulty = data.difficulty || 'medium'; 
        const settings = DIFFICULTY_SETTINGS[difficulty];

        if (!settings) {
            socket.emit('roomError', 'Độ khó không hợp lệ.');
            return;
        }
        
        // 1. Kiểm tra/Tạo phòng mới
        if (!rooms[roomId]) {
            rooms[roomId] = createGameState(roomId, settings);
            console.log(`Phòng mới được tạo: ${roomId} (Độ khó: ${difficulty})`);
        }
        
        const room = rooms[roomId];
        
        const player1Id = Object.keys(room.players).find(id => room.players[id].number === 1);
        const player2Id = Object.keys(room.players).find(id => room.players[id].number === 2);
        
        // Nếu chỉ có P1/P2 đang kết nối, và socket.id này không trùng (người mới vào)
        if (room.playerCount < 2 && !room.players[socket.id]) {
            
            // Tìm số người chơi còn trống (ưu tiên 1)
            let newPlayerNum;
            if (!player1Id) {
                newPlayerNum = 1;
            } else if (!player2Id) {
                newPlayerNum = 2;
            } else {
                socket.emit('roomError', `Phòng ${roomId} đã đầy.`);
                return;
            }

            // 2. Tham gia phòng
            currentRoomId = roomId;
            currentPlayerNum = newPlayerNum;
            
            socket.join(roomId);

            // Khởi tạo vị trí paddle cho người chơi mới
            const PADDLE_HEIGHT = room.settings.PADDLE_HEIGHT;
            const pData = (newPlayerNum === 1) 
                ? { x: 10, y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2, dy: 0, number: 1 }
                : { x: GAME_WIDTH - PADDLE_WIDTH - 10, y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2, dy: 0, number: 2 };
            
            room.players[socket.id] = { ...pData, id: socket.id };
            room.playerCount++;

            // Gửi thông tin người chơi và cài đặt độ khó cho Client
            socket.emit('playerAssignment', { 
                playerNum: currentPlayerNum, 
                isP1: (currentPlayerNum === 1), 
                settings: room.settings 
            });
            
            console.log(`Người chơi ${currentPlayerNum} đã vào phòng ${roomId}`);

            // 3. Nếu phòng đủ người, bắt đầu game
            if (room.playerCount === 2) {
                io.to(roomId).emit('gameStart');
                resetBall(room);
                room.score = { player1: 0, player2: 0 };
                room.isGameOver = false;
                
                // Bắt đầu vòng lặp game chỉ cho phòng này
                if (!room.gameInterval) {
                    room.gameInterval = setInterval(() => {
                        updateGame(room);
                        io.to(roomId).emit('gameState', room);
                    }, 1000 / 60); // 60 FPS
                }
            } else {
                // Thông báo cho người chơi 1 rằng đang chờ
                socket.emit('waiting', `Đã tham gia phòng ${roomId}. Đang chờ người chơi 2...`);
            }
        } else {
             socket.emit('roomError', `Phòng ${roomId} đã đầy.`);
        }
    });


    // Xử lý di chuyển Paddle
    socket.on('paddleMove', (data) => {
        if (!currentRoomId || !rooms[currentRoomId]) return;
        
        const room = rooms[currentRoomId];
        const player = room.players[socket.id];
        if (player) {
            player.dy = data.direction * PADDLE_SPEED; 
        }
    });

    // Xử lý Restart Game
    socket.on('restartGame', () => {
        if (!currentRoomId || !rooms[currentRoomId]) return;

        const room = rooms[currentRoomId];
        if (room.isGameOver && room.playerCount === 2) { 
            console.log(`Phòng ${currentRoomId} đã Restart.`);
            resetBall(room);
            room.score = { player1: 0, player2: 0 };
            room.isGameOver = false;
            room.colorIndex = 0; 
            io.to(currentRoomId).emit('gameState', room); 
        }
    });

    // Xử lý ngắt kết nối
    socket.on('disconnect', () => {
        if (!currentRoomId || !rooms[currentRoomId]) return;

        const room = rooms[currentRoomId];
        
        // Xóa người chơi khỏi phòng
        if (room.players[socket.id]) {
            delete room.players[socket.id]; 
            room.playerCount--;
        }

        // Nếu còn 1 người chơi
        if (room.playerCount === 1) {
            room.isGameOver = true;
            io.to(currentRoomId).emit('playerDisconnected', 'Đối thủ đã thoát. Đang chờ người chơi mới...');
            
            if (room.gameInterval) {
                clearInterval(room.gameInterval);
                room.gameInterval = null;
            }

        } else if (room.playerCount === 0) {
            // Nếu phòng trống, xóa phòng và dọn dẹp interval
            if (room.gameInterval) {
                clearInterval(room.gameInterval);
            }
            delete rooms[currentRoomId];
            console.log(`Phòng ${currentRoomId} đã bị xóa.`);
        }
    });
});

// --- 4. CÀI ĐẶT EXPRESS ---
app.use(express.static('public')); 

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server đang chạy trên http://localhost:${PORT}`);
});