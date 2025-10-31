const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + "/public"));

let players = {}; // { id: { y, score } }
let ball = { x: 300, y: 200, dx: 4, dy: 4, radius: 8 };
const canvasWidth = 600;
const canvasHeight = 400;
const WIN_SCORE = 5;

// 🟢 Lưu các người chơi đã nhấn "Chơi lại"
let rematchSet = new Set();

// Khi có client kết nối
io.on("connection", (socket) => {
  console.log("🟢", socket.id, "connected");
  players[socket.id] = { y: 200, score: 0 };

  // Nhận dữ liệu di chuyển từ client
  socket.on("move", (posY) => {
    if (players[socket.id]) {
      const minY = 40;
      const maxY = canvasHeight - 40;
      players[socket.id].y = Math.max(minY, Math.min(maxY, posY));
    }
  });

  // Khi người chơi yêu cầu tái đấu
  socket.on("requestRematch", () => {
  rematchSet.add(socket.id);
  const ids = Object.keys(players);

  // Nếu chỉ có 1 người nhấn
  if (rematchSet.size === 1) {
    ids.forEach(id => {
      if (id !== socket.id) {
        io.to(id).emit("message", "🔁 Đối thủ muốn tái đấu!");
      }
    });
  }

  // Nếu cả 2 đều nhấn
  if (rematchSet.size === 2) {
    rematchSet.clear();
    resetGame();
    io.emit("rematchStart"); // ✅ Gửi sự kiện bắt đầu lại
    io.emit("message", "🔁 Trận đấu mới bắt đầu!");
  }
});


  // Khi người chơi ngắt kết nối
  socket.on("disconnect", () => {
    delete players[socket.id];
    rematchSet.delete(socket.id);
    console.log("🔴", socket.id, "disconnected");
  });
});

// Reset lại toàn bộ điểm & bóng
function resetGame() {
  for (const id in players) {
    players[id].score = 0;
    players[id].y = 200;
  }
  resetBall();
}

// Reset bóng về giữa sân
function resetBall() {
  ball.x = canvasWidth / 2;
  ball.y = canvasHeight / 2;
  ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
  ball.dy = 3 * (Math.random() > 0.5 ? 1 : -1);
}

// Vòng lặp cập nhật bóng & gửi dữ liệu cho client
setInterval(() => {
  const ids = Object.keys(players);
  if (ids.length < 2) return; // chỉ chơi khi đủ 2 người

  ball.x += ball.dx;
  ball.y += ball.dy;

  // Va chạm cạnh trên/dưới
  if (ball.y + ball.radius > canvasHeight || ball.y - ball.radius < 0) {
    ball.dy *= -1;
  }

  const left = players[ids[0]];
  const right = players[ids[1]];

  // Paddle trái
  if (
    ball.x - ball.radius < 30 &&
    ball.y > left.y - 40 &&
    ball.y < left.y + 40
  ) {
    ball.dx *= -1;
    ball.x = 30 + ball.radius;
  }

  // Paddle phải
  if (
    ball.x + ball.radius > canvasWidth - 30 &&
    ball.y > right.y - 40 &&
    ball.y < right.y + 40
  ) {
    ball.dx *= -1;
    ball.x = canvasWidth - 30 - ball.radius;
  }

  // Nếu bóng ra khỏi biên ngang
  if (ball.x < 0) {
    right.score++;
    io.emit("message", "🏓 Người chơi bên phải ghi điểm!");
    resetBall();
  } else if (ball.x > canvasWidth) {
    left.score++;
    io.emit("message", "🏓 Người chơi bên trái ghi điểm!");
    resetBall();
  }

  // 🟡 Kiểm tra thắng cuộc
  if (left.score >= WIN_SCORE || right.score >= WIN_SCORE) {
    const winner = left.score >= WIN_SCORE ? "Bên trái" : "Bên phải";
    io.emit("gameOver", { winner });
    resetBall();
  }

  // Gửi dữ liệu cập nhật cho client
  io.emit("update", { players, ball });
}, 30);

// Khởi động server
server.listen(3000, () => {
  console.log("✅ Server running at http://localhost:3000");
});
