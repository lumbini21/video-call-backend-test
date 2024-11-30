// const functions = require("firebase-functions");
const express = require('express');
const http = require('http');
const socket = require('socket.io');
const cors = require('cors');
const { send } = require('process');

const app = express();
const server = http.createServer(app);

// Enable CORS for Express routes
app.use(cors());

// Initialize Socket.IO with CORS configuration
const io = socket(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"], 
    allowedHeaders: ["Content-Type"], 
    credentials: true, 
  },
});

const rooms = {};

io.on("connection", (socket) => {
  console.log('New client connected:', socket.id);

  socket.on("join room", (roomID) => {
    socket.join(roomID);
    console.log(`${socket.id} joined room: ${roomID}`);

    if (rooms[roomID]) {
      rooms[roomID].push(socket.id);
    } else {
      rooms[roomID] = [socket.id];
    }
    const otherUser = rooms[roomID].find((id) => id !== socket.id);
    if (otherUser) {
      socket.emit("other user", otherUser);
      socket.to(otherUser).emit("user joined", socket.id);
    }
  });

  socket.on("offer", (payload) => {
    io.to(payload.target).emit("offer", payload);
  });

  socket.on("answer", (payload) => {
    io.to(payload.target).emit("answer", payload);
  });

  socket.on("ice-candidate", (incoming) => {
    io.to(incoming.target).emit("ice-candidate", incoming.candidate);
  });

  socket.on("send message", ({ text, roomID }) => {
      // console.log(`Message received in room ${roomID}: ${text}`);
      // Broadcast the message to everyone else in the room
      console.log(`Broadcasting message to room ${roomID}: ${text}`);
      socket.to(roomID).emit("receive message", {sender: socket.id, text});
  });

  socket.on("disconnect", () => {
    console.log('Client disconnected:', socket.id);
    
    for (const room in rooms) {
      rooms[room] = rooms[room].filter((id) => id !== socket.id);
      if (rooms[room].length === 0) {
        delete rooms[room];
      }
    }
  });
});

const port = process.env.PORT || 8000;
server.listen(port, () => console.log(`Server is running on port ${port}`));

// exports.api = functions.https.onRequest(app);
