const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

let rooms = {};

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("join-room", (roomID) => {
    socket.join(roomID);
    console.log(`User joined room: ${roomID}`);

    socket.to(roomID).emit("user-joined", socket.id);

    if (!rooms[roomID]) {
      rooms[roomID] = [];
    }
    rooms[roomID].push(socket.id);
  });

  socket.on("offer", (data) => {
    console.log("Sending offer to peer");
    socket.to(data.roomID).emit("offer", data.offer);
  });

  socket.on("answer", (data) => {
    console.log("Sending answer to peer");
    socket.to(data.roomID).emit("answer", data.answer);
  });

  socket.on("ice-candidate", (data) => {
    console.log("Sending ICE candidate");
    socket.to(data.roomID).emit("ice-candidate", data.candidate);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
    for (let roomID in rooms) {
      rooms[roomID] = rooms[roomID].filter((id) => id !== socket.id);
      if (rooms[roomID].length === 0) {
        delete rooms[roomID];
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
