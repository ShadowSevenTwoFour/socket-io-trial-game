const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const players = {};  // Tracks all players (name, ready status, etc.)
const rooms = {};

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinRoom', ({roomID, playerName}) => {
    if (!rooms[roomID]) {
        rooms[roomID] = [];
      }
  

      const player = {
        id: socket.id,
        name: playerName,
        x: Math.random() * 360,  
        y: Math.random() * 360, 
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,  
        ready: false 
      };

      rooms[roomID].push(player);
        socket.join(roomID);


    io.to(roomID).emit('updateLobby', rooms[roomID]);
    io.to(roomID).emit('syncPlayers', rooms[roomID]);

    console.log(`Player ${playerName} joined room ${roomID}`);
  });


  socket.on('toggleReady', ({roomID, isReady}) => {
    io.to(roomID).emit('syncPlayers', rooms[roomID]);
    const player = rooms[roomID]?.find(p => p.id === socket.id);
    if (player) {
      player.ready = isReady;
      io.to(roomID).emit('updateLobby', rooms[roomID]);

      // Check if all players in the room are ready
      const allPlayersReady = rooms[roomID].every(player => player.ready);
      if (allPlayersReady) {
        io.to(roomID).emit('allPlayersReady'); 
      }
    }
  });

  socket.on('movePlayer', ({ roomID, x, y }) => {
    const player = rooms[roomID]?.find(p => p.id === socket.id);
    if (player) {
      player.x = x;
      player.y = y;
      io.to(roomID).emit('syncPlayers', rooms[roomID]);  // Only sync within the room
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Remove the player from the rooms they belong to
    for (const roomID in rooms) {
      const room = rooms[roomID];
      const playerIndex = room.findIndex(player => player.id === socket.id);
      if (playerIndex !== -1) {
        room.splice(playerIndex, 1);  // Remove player from room
        io.to(roomID).emit('updateLobby', rooms[roomID]);  // Update remaining players in the room
        io.to(roomID).emit('syncPlayers', rooms[roomID]);
      }
    }
  });
});

setInterval(() => {
    for (const roomID in rooms) {
        io.to(roomID).emit('syncPlayers', rooms[roomID]);
      }
  }, 1000/60);  // Sync every 16.66ms (60 times per second)


server.listen(5000, () => {
  console.log('Server is running on port 5000');
});
