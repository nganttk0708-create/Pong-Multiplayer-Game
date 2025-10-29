const express = require("express");
const http = require("http");
const path = require("path");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// ⚙️ Trỏ đến thư mục chứa giao diện (public)
app.use(express.static(path.join(__dirname, "..", "public")));

// 🏠 Route cho trang chủ "/"
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// 💬 (Giữ nguyên phần socket.io)
io.on("connection", (socket) => {
  console.log("Client connected");
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// 🚀 Dùng PORT động của Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server chạy tại cổng ${PORT}`));
