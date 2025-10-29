const express = require("express");
const http = require("http");
const path = require("path");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Dùng thư mục public để hiển thị giao diện
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// =========================================
//        QUẢN LÝ PHÒNG VÀ NGƯỜI CHƠI
// =========================================
const rooms = {}; // Lưu danh sách phòng và số lượng người trong đó

io.on("connection", (socket) => {
  console.log(`🔵 ${socket.id} đã kết nối`);

  // 🏠 Người chơi tạo phòng
  socket.on("createRoom", () => {
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[roomCode] = [socket.id]; // danh sách người chơi trong phòng
    socket.join(roomCode);
    socket.emit("roomCreated", roomCode);
    console.log(`🟢 ${socket.id} đã tạo phòng ${roomCode}`);
  });

  // 👥 Người chơi tham gia phòng
  socket.on("joinRoom", (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.length === 1) {
      // Cho người thứ 2 vào phòng
      room.push(socket.id);
      socket.join(roomCode);
      io.to(roomCode).emit("startGame", { roomCode });
      console.log(`🟡 ${socket.id} đã vào phòng ${roomCode}`);
    } else if (room && room.length >= 2) {
      socket.emit("roomError", "Phòng này đã đủ người!");
    } else {
      socket.emit("roomError", "Phòng không tồn tại!");
    }
  });

  // ❌ Khi người chơi thoát
  socket.on("disconnect", () => {
    for (const [code, players] of Object.entries(rooms)) {
      const index = players.indexOf(socket.id);
      if (index !== -1) {
        players.splice(index, 1);
        io.to(code).emit("playerLeft", "Người kia đã thoát!");
        console.log(`🔴 ${socket.id} rời phòng ${code}`);
        if (players.length === 0) delete rooms[code]; // Xóa phòng rỗng
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server chạy tại cổng ${PORT}`));
