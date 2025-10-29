document.addEventListener("DOMContentLoaded", () => {
  const socket = io(window.location.origin, { transports: ["websocket"], secure: true });

  const lobby = document.getElementById("lobby");
  const createRoom = document.getElementById("create-room");
  const joinRoom = document.getElementById("join-room");
  const gameDiv = document.getElementById("game");
  const message = document.getElementById("message");

  const randomBtn = document.getElementById("randomBtn");
  const createBtn = document.getElementById("createBtn");
  const joinBtn = document.getElementById("joinBtn");
  const joinRoomBtn = document.getElementById("joinRoomBtn");
  const roomInput = document.getElementById("roomInput");
  const backBtns = document.querySelectorAll(".backBtn");
  const roomCodeDisplay = document.getElementById("roomCodeDisplay");
  const rematchBtn = document.getElementById("rematchBtn");
  const exitBtn = document.getElementById("exitBtn");

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // ----- Biến game -----
  const PADDLE_HEIGHT = 80;
  const PADDLE_WIDTH = 10;
  let paddle1Y = 160;
  let paddle2Y = 160;
  let ballX = 300, ballY = 200, ballDX = 3, ballDY = 2;
  let gameStarted = false;

  const keys = {};

  // ====== NÚT Ở LOBBY ======
  randomBtn.onclick = () => {
    socket.emit("playRandom");
    message.textContent = "🎲 Đang tìm người chơi khác...";
  };

  createBtn.onclick = () => {
    socket.emit("createRoom");
    lobby.style.display = "none";
    createRoom.style.display = "block";
  };

  joinBtn.onclick = () => {
    lobby.style.display = "none";
    joinRoom.style.display = "block";
  };

  joinRoomBtn.onclick = () => {
    const code = roomInput.value.trim().toUpperCase();
    if (!code) return alert("Vui lòng nhập mã phòng!");
    socket.emit("joinRoom", code);
    message.textContent = `🔑 Đang tham gia phòng ${code}...`;
  };

  backBtns.forEach(btn => btn.onclick = resetLobby);

  // ====== NÚT TRONG GAME ======
  rematchBtn.onclick = () => {
    resetBall();
  };
  exitBtn.onclick = resetLobby;

  // ====== SOCKET ======
  socket.on("waiting", msg => message.textContent = msg);
  socket.on("roomCreated", code => roomCodeDisplay.textContent = `Mã phòng của bạn: ${code}`);
  socket.on("roomError", msg => alert(msg));
  socket.on("startGame", data => startGame(data.roomCode));
  socket.on("playerLeft", msg => { alert(msg); resetLobby(); });

  // ====== HÀM GAME ======
  function startGame(code) {
    hideAll();
    gameDiv.style.display = "block";
    message.textContent = `🚀 Trận đấu bắt đầu! Mã phòng: ${code}`;
    gameStarted = true;
    startLoop();
  }

  function hideAll() {
    [lobby, createRoom, joinRoom, gameDiv].forEach(el => el.style.display = "none");
  }

  function resetLobby() {
    hideAll();
    lobby.style.display = "block";
    message.textContent = "";
    gameStarted = false;
  }

  // ====== VẬN ĐỘNG ======
  document.addEventListener("keydown", e => (keys[e.key] = true));
  document.addEventListener("keyup", e => (keys[e.key] = false));

  function movePaddles() {
    const speed = 5;
    if (keys["w"] && paddle1Y > 0) paddle1Y -= speed;
    if (keys["s"] && paddle1Y < canvas.height - PADDLE_HEIGHT) paddle1Y += speed;
    if (keys["ArrowUp"] && paddle2Y > 0) paddle2Y -= speed;
    if (keys["ArrowDown"] && paddle2Y < canvas.height - PADDLE_HEIGHT) paddle2Y += speed;
  }

  function resetBall() {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    ballDX = 3 * (Math.random() > 0.5 ? 1 : -1);
    ballDY = 2 * (Math.random() > 0.5 ? 1 : -1);
  }

  function updateBall() {
    ballX += ballDX;
    ballY += ballDY;

    // Tường trên/dưới
    if (ballY < 0 || ballY > canvas.height) ballDY *= -1;

    // Va chạm thanh trái
    if (ballX <= PADDLE_WIDTH && ballY >= paddle1Y && ballY <= paddle1Y + PADDLE_HEIGHT)
      ballDX *= -1;

    // Va chạm thanh phải
    if (ballX >= canvas.width - PADDLE_WIDTH &&
        ballY >= paddle2Y &&
        ballY <= paddle2Y + PADDLE_HEIGHT)
      ballDX *= -1;

    // Ghi điểm
    if (ballX < 0 || ballX > canvas.width) resetBall();
  }

  function draw() {
    // Nền
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Viền sân
    ctx.strokeStyle = "#4CAF50";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Thanh đỡ
    ctx.fillStyle = "#4CAF50";
    ctx.fillRect(0, paddle1Y, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillRect(canvas.width - PADDLE_WIDTH, paddle2Y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Bóng
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(ballX, ballY, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  function startLoop() {
    function loop() {
      if (!gameStarted) return;
      movePaddles();
      updateBall();
      draw();
      requestAnimationFrame(loop);
    }
    loop();
  }
});
