const path = require('path');
const express = require('express');
const app = express();
const port = 3000;
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get('/socket.io/socket.io.js', (req, res) => {
  res.sendFile(path.join(__dirname, "node_modules/socket.io-client/dist/socket.io.js"));
});

app.use(express.static('public'));

rooms = {};

io.on('connection', function(socket) {
  console.log('a user connected');
  let connectedRoom;

  socket.on('joinRoom', function(roomCode) {
    if (connectedRoom) {
      socket.leave(connectedRoom);
      console.log(`a user left room ${connectedRoom}`);
    }
    socket.join(roomCode);
    console.log(`a user joined room ${roomCode}`);
    connectedRoom = roomCode;
    if (!rooms[connectedRoom]) {
      rooms[connectedRoom] = [];
    }
  });

  socket.on('getNextSong', function() {
    if (connectedRoom) {
      if (rooms[connectedRoom].length > 0) {
        io.to(connectedRoom).emit("playNextSong", rooms[connectedRoom].shift());
      } else {
        io.to(connectedRoom).emit("playNextSong", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      }
    }
  });

  socket.on('statusUpdate', function(status) {
    if (connectedRoom) {
      io.to(connectedRoom).emit("statusUpdate", status);
      io.to(connectedRoom).emit("queueList", rooms[connectedRoom]);
    }
  });

  socket.on('addToQueue', (videoUrl) => {
    if (connectedRoom) {
      rooms[connectedRoom].push(videoUrl);
    }
  });

  socket.on('disconnect', function(reason) {
    console.log(`a user disconnected due to ${reason}`);
  });
});

server.listen(port, () => {
  console.log(`App listening on port ${port}!`);
});
