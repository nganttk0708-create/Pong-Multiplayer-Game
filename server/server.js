const express = require("express");
const http = require("http");
const path = require("path");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// ⚙️ Cấu hình static để client truy cập
app.use(express.static(path.join(__dirname, "..", "public")));

const rooms = {};          // Danh sách phòng: { roomCode: [socketId1, socketId2] }
let waitingPlayer = null;  // Người đang chờ trong chế độ ngẫu nhiên

// =============================================================
// 🔌 XỬ LÝ KẾT NỐI SOCKET.IO
// =============================================================
io.on("connection", (socket) => {
  console.log(`🔵 ${socket.id} đã kết nối`);

  // 🎮 Người chơi tạo phòng riêng
  socket.on("createRoom", () => {
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[roomCode] = [socket.id];
    socket.join(roomCode);
    socket.emit("roomCreated", roomCode);
    console.log(`📦 ${socket.id} tạo phòng ${roomCode}`);
  });

  // 🔑 Người chơi tham gia phòng riêng
  socket.on("joinRoom", (roomCode) => {
    const room = rooms[roomCode];
    if (!room) {
      socket.emit("roomError", "❌ Phòng không tồn tại!");
      return;
    }

    if (room.length === 1) {
      room.push(socket.id);
      socket.join(roomCode);
      io.to(roomCode).emit("startGame", { roomCode });
      console.log(`✅ ${socket.id} tham gia phòng ${roomCode}`);
    } else {
      socket.emit("roomError", "⚠️ Phòng đã đủ người!");
    }
  });

  // 🎲 Người chơi chọn “chơi ngẫu nhiên”
  socket.on("playRandom", () => {
    if (!waitingPlayer) {
      waitingPlayer = socket;
      socket.emit("waiting", "⏳ Đang tìm người chơi khác...");
      console.log(`🕐 ${socket.id} đang chờ người chơi...`);
    } else {
      const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
      rooms[roomCode] = [waitingPlayer.id, socket.id];

      waitingPlayer.join(roomCode);
      socket.join(roomCode);
      io.to(roomCode).emit("startGame", { roomCode });
      console.log(`🎯 Ghép thành công: ${waitingPlayer.id} vs ${socket.id} (${roomCode})`);

      waitingPlayer = null;
    }
  });

  // 🚪 Ngắt kết nối
  socket.on("disconnect", () => {
    console.log(`🔴 ${socket.id} đã thoát`);
    if (waitingPlayer && waitingPlayer.id === socket.id) waitingPlayer = null;

    for (const [code, players] of Object.entries(rooms)) {
      const idx = players.indexOf(socket.id);
      if (idx !== -1) {
        players.spl
