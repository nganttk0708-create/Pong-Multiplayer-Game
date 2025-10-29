const express = require("express");
const http = require("http");
const path = require("path");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, "..", "public")));

const rooms = {}; // lưu danh sách phòng
let waitingPlayer = null; // người đang chờ chơi ngẫu nhiên

io.on("connection", (socket) => {
  console.log(`🔵 ${socket.id} đã kết nối`);

  // 🎲 Chơi ngẫu nhiên
  socket.on("playRandom", () => {
    if (!waitingPlayer) {
      waitingPlayer = socket;
      socket.emit("waiting", "Đang tìm người chơi khác...");
    } else {
      const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
      rooms[roomCode] = [waitingPlayer.id, socket.id];
      waitingPlayer.join(roomCode);
      socket.join(roomCode);
      io.to(roomCode).emit("startGame", { roomCode });
      waitingPlayer = null;
    }
  });

  // 🎮 Tạo phòng
  socket.on("createRoom", () => {
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[roomCode] = [socket.id];
    socket.join(roomCode);
    socket.emit("roomCreated", roomCode);
  });

  // 🔑 Tham gia phòng
  socket.on("joinRoom", (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.length === 1) {
      room.push(socket.id);
      socket.join(roomCode);
      io.to(roomCode).emit("startGame", { roomCode });
    } else if (room && room.length >= 2) {
      socket.emit("roomError", "Phòng này đã đủ người!");
    } else {
      socket.emit("roomError", "Phòng không tồn tại!");
    }
  });

  socket.on("disconnect", () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) waitingPlayer = null;
    for (const [code, players] of Object.entries(rooms)) {
      const idx = players.indexOf(socket.id);
      if (idx !== -1) {
        players.splice(idx, 1);
        io.to(code).emit("playerLeft", "Người kia đã thoát!");
        if (players.length === 0) delete rooms[code];
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server chạy tại cổng ${PORT}`));
