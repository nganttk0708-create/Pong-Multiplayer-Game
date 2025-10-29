const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// ✅ Cho phép client kết nối từ Render (CORS)
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(express.static(path.join(__dirname, "..", "public")));

let rooms = {};
let waitingPlayer = null;

io.on("connection", (socket) => {
  console.log(`🔵 Người chơi kết nối: ${socket.id}`);

  // ============================
  // 🔹 TÌM TRẬN NGẪU NHIÊN
  // ============================
  socket.on("playRandom", () => {
    if (!waitingPlayer) {
      waitingPlayer = socket;
      socket.emit("waiting", "⏳ Đang chờ người chơi khác...");
      console.log(`🕐 ${socket.id} đang chờ...`);
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

  // ============================
  // 🔹 TẠO PHÒNG RIÊNG
  // ============================
  socket.on("createRoom", () => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[code] = [socket.id];
    socket.join(code);
    socket.emit("roomCreated", code);
    console.log(`🏠 ${socket.id} tạo phòng ${code}`);
  });

  // ============================
  // 🔹 THAM GIA PHÒNG RIÊNG
  // ============================
  socket.on("joinRoom", (code) => {
    const room = rooms[code];
    if (!room) return socket.emit("roomError", "❌ Phòng không tồn tại!");
    if (room.length >= 2) return socket.emit("roomError", "⚠️ Phòng đã đủ người!");

    room.push(socket.id);
    socket.join(code);
    io.to(code).emit("startGame", { roomCode: code });
    console.log(`✅ ${socket.id} tham gia phòng ${code}`);
  });

  // ============================
  // 🔹 NGẮT KẾT NỐI
  // ============================
  socket.on("disconnect", () => {
    console.log(`🔴 ${socket.id} đã thoát`);

    if (waitingPlayer && waitingPlayer.id === socket.id) waitingPlayer = null;

    for (const [code, players] of Object.entries(rooms)) {
      const idx = players.indexOf(socket.id);
      if (idx !== -1) {
        players.splice(idx, 1);
        io.to(code).emit("playerLeft", "❗ Người chơi kia đã rời trận!");
        if (players.length === 0) delete rooms[code];
      }
    }
  });
});

// ============================
// 🚀 CHẠY SERVER
// ============================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
