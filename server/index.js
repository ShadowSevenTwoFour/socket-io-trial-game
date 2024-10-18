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

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinLobby', (playerName) => {

    players[socket.id] = { 
      id: socket.id,
      name: playerName,
      x: Math.random() * 360,  
      y: Math.random() * 360, 
      color: `hsl(${Math.random() * 360}, 100%, 50%)`,  
      ready: false 
    };


    console.log('Updated players object:', players);

    io.emit('updateLobby', Object.values(players));
    io.emit('syncPlayers', Object.values(players));

    console.log('Broadcasting syncPlayers:', Object.values(players));
  });


  socket.on('toggleReady', (isReady) => {
    io.emit('syncPlayers', Object.values(players));
    if (players[socket.id]) {
      players[socket.id].ready = isReady;
      io.emit('updateLobby', Object.values(players)); 

      const allPlayersReady = Object.values(players).every(player => player.ready);
      if (allPlayersReady) {
        io.emit('allPlayersReady'); 
      }
      console.log('Updated players after readying:', Object.values(players));
    }
  });

  socket.on('movePlayer', ({ x, y, id }) => {
    if (players[id]) {
      players[id].x = x;
      players[id].y = y; 
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    delete players[socket.id];  
    io.emit('updateLobby', Object.values(players));  
    io.emit('syncPlayers', Object.values(players)); 
    console.log('Updated players after disconnect:', Object.values(players));
  });
});

setInterval(() => {
    io.emit('syncPlayers', Object.values(players));
  }, 1000/60);  // Sync every 25ms (40 times per second)


server.listen(5000, () => {
  console.log('Server is running on port 5000');
});
