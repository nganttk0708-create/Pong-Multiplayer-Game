document.addEventListener("DOMContentLoaded", () => {
  const socket = io(window.location.origin, {
    transports: ["websocket"],
    secure: true,
  });

  const lobby = document.getElementById("lobby");
  const createRoom = document.getElementById("create-room");
  const joinRoom = document.getElementById("join-room");
  const gameDiv = document.getElementById("game");
  const message = document.getElementById("message");

  const randomBtn = document.getElementById("randomBtn");
  const createBtn = document.getElementById("createBtn");
  const joinRoomBtn = document.getElementById("joinRoomBtn");
  const roomInput = document.getElementById("roomInput");
  const backBtns = document.querySelectorAll(".backBtn");
  const roomCodeDisplay = document.getElementById("roomCodeDisplay");
  const rematchBtn = document.getElementById("rematchBtn");
  const exitBtn = document.getElementById("exitBtn");

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  let gameStarted = false;

  // === NÚT CHỨC NĂNG ===
  randomBtn.addEventListener("click", () => {
    socket.emit("playRandom");
    message.textContent = "🎲 Đang tìm người chơi khác...";
  });

  createBtn.addEventListener("click", () => {
    socket.emit("createRoom");
    lobby.style.display = "none";
    createRoom.style.display = "block";
  });

  joinRoomBtn.addEventListener("click", () => {
    const code = roomInput.value.trim().toUpperCase();
    if (!code) return alert("Vui lòng nhập mã phòng!");
    socket.emit("joinRoom", code);
    message.textContent = `🔑 Đang tham gia phòng ${code}...`;
  });

  backBtns.forEach(btn => btn.addEventListener("click", resetLobby));

  rematchBtn.addEventListener("click", () => {
    socket.emit("playRandom");
    message.textContent = "🔁 Đang tìm người chơi khác...";
  });

  exitBtn.addEventListener("click", resetLobby);

  // === SỰ KIỆN SOCKET ===
  socket.on("waiting", msg => message.textContent = msg);
  socket.on("roomCreated", code => roomCodeDisplay.textContent = `Mã phòng của bạn: ${code}`);
  socket.on("roomError", msg => alert(msg));

  socket.on("startGame", data => {
    hideAll();
    gameDiv.style.display = "block";
    message.textContent = `🚀 Trận đấu bắt đầu! Mã phòng: ${data.roomCode}`;
    gameStarted = true;
    startDemoGame();
  });

  socket.on("playerLeft", msg => {
    alert(msg);
    resetLobby();
  });

  // === GIẢ LẬP GAME (hiệu ứng bóng chạy) ===
  function startDemoGame() {
    let x = 0;
    const loop = () => {
      if (!gameStarted) return;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(50 + x, 200, 15, 0, Math.PI * 2);
      ctx.fill();
      x += 3;
      if (x > canvas.width) x = 0;
      requestAnimationFrame(loop);
    };
    loop();
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
});
