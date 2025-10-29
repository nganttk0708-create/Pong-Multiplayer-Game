const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
let players = [];

io.on('connection', (socket) => {
  console.log('Người chơi kết nối:', socket.id);

  // Gán người chơi
  if (players.length < 2) {
    players.push(socket.id);
    socket.emit('playerNumber', players.length);
    console.log(`Người chơi ${players.length} đã vào`);
  } else {
    socket.emit('roomFull');
    return;
  }

  // Khi 2 người sẵn sàng, thông báo bắt đầu
  if (players.length === 2) {
    io.emit('startGame');
  }

  // Nhận và phát vị trí thanh trượt
  socket.on('paddleMove', (data) => {
    socket.broadcast.emit('paddleMove', data);
  });

  // Khi thoát hoặc nhấn nút Thoát
  socket.on('exitGame', () => {
    io.emit('gameEnded', { by: socket.id });
    players = [];
  });

  socket.on('disconnect', () => {
    console.log('Người chơi ngắt kết nối:', socket.id);
    players = players.filter(id => id !== socket.id);
    io.emit('playerLeft');
  });
});

server.listen(PORT, () => console.log(`Server chạy tại http://localhost:${PORT}`));
