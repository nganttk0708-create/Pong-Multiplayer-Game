const socket = io();

document.addEventListener("DOMContentLoaded", () => {
  const ui = document.createElement("div");
  ui.style.textAlign = "center";
  ui.style.marginTop = "40px";

  const info = document.createElement("div");
  const randomBtn = document.createElement("button");
  const createBtn = document.createElement("button");
  const joinBtn = document.createElement("button");
  const input = document.createElement("input");

  randomBtn.innerText = "🎲 Chơi ngẫu nhiên";
  createBtn.innerText = "🎮 Tạo phòng";
  joinBtn.innerText = "🔑 Tham gia phòng";
  input.placeholder = "Nhập mã phòng";

  randomBtn.style.margin = createBtn.style.margin = joinBtn.style.margin = "8px";

  ui.appendChild(info);
  ui.appendChild(randomBtn);
  ui.appendChild(document.createElement("br"));
  ui.appendChild(createBtn);
  ui.appendChild(document.createElement("br"));
  ui.appendChild(input);
  ui.appendChild(joinBtn);
  document.body.prepend(ui);

  // ======= Sự kiện socket =======
  randomBtn.onclick = () => socket.emit("playRandom");
  createBtn.onclick = () => socket.emit("createRoom");
  joinBtn.onclick = () => {
    const code = input.value.trim().toUpperCase();
    if (code) socket.emit("joinRoom", code);
  };

  socket.on("waiting", (msg) => {
    info.innerHTML = `<b>${msg}</b>`;
  });

  socket.on("roomCreated", (code) => {
    info.innerHTML = `<b>Phòng của bạn: ${code}</b><br>Chia sẻ mã này cho bạn bè!`;
  });

  socket.on("startGame", ({ roomCode }) => {
    info.innerHTML = `<b>Phòng ${roomCode}: Trận đấu bắt đầu!</b>`;
    startGame(); // Bắt đầu game khi đủ 2 người
  });

  socket.on("roomError", (msg) => {
    info.innerHTML = `<span style="color:red">${msg}</span>`;
  });

  socket.on("playerLeft", (msg) => {
    info.innerHTML = `<span style="color:red">${msg}</span>`;
  });
});
