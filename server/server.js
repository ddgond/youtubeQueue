const path = require('path');
const express = require('express');
const app = express();
const port = 3000;
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const { YoutubeDataAPI } = require("youtube-v3-api");
const youtube = "AIzaSyDY88lH4lop431dP6hYrKvqpXM4L1aTDnAs"; // substring last char to prevent scraping of key, yes this is terrible practice
const ytKey = youtube.substring(0, youtube.length - 1)
const ytApi = new YoutubeDataAPI(ytKey);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get('/socket.io/socket.io.js', (req, res) => {
  res.sendFile(path.join(__dirname, "node_modules/socket.io-client/dist/socket.io.js"));
});

app.use(express.static('public'));

rooms = {};

ytSearch = (searchTerm) => { // Returns a Promise
  return new Promise((resolve, reject) => {
    ytApi.searchAll(searchTerm, 5, {type: "video"}).then((data) => {
      resolve(data.items);
    });
  });
}

// ytSearch("diggy diggy hole").then((results)=>console.log(results));
// result
// {
//   kind: 'youtube#searchResult',
//   etag: '"Fznwjl6JEQdo1MGvHOGaz_YanRU/zYwQecK_9-LYq4oBRpzO0mMq8UE"',
//   id: { kind: 'youtube#video', videoId: 'ytWz0qVvBZ0' },
//   snippet: {
//     publishedAt: '2014-07-11T17:00:02.000Z',
//     channelId: 'UCH-_hzb2ILSCo9ftVSnrCIQ',
//     title: '♪ Diggy Diggy Hole',
//     description: 'Out now on iTunes: http://apple.co/2uVgfmL ♪ Amazon UK: http://bit.ly/DiggyAmazonUK ♪ Amazon US: http://bit.ly/DiggyAmazonUS ♥ Diggy Diggy Hole T-shirt: ...',
//     thumbnails: [Object],
//     channelTitle: 'YOGSCAST Lewis & Simon',
//     liveBroadcastContent: 'none'
//   }
// }

sortRoom = (roomCode) => {
  rooms[roomCode].sort((a, b) => {
    if (a.votes.length > b.votes.length) {
      return -1;
    }
    if (a.votes.length < b.votes.length) {
      return 1;
    }
    if (a.votes.length === b.votes.length) {
      return a.time - b.time;
    }
  });
}

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

  socket.on('leaveRoom', function() {
    if (connectedRoom) {
      socket.leave(connectedRoom);
      console.log(`a user left room ${connectedRoom}`);
      connectedRoom = null;
    }
  });

  socket.on('getNextSong', function() {
    if (connectedRoom) {
      if (rooms[connectedRoom].length > 0) {
        io.to(connectedRoom).emit("playNextSong", `https://www.youtube.com/watch?v=${rooms[connectedRoom].shift().video.id.videoId}`);
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

  socket.on('search', (query) => {
    ytSearch(query).then((results) => {
      socket.emit("searchResults", results);
    })
  });

  socket.on('addToQueue', (video) => {
    if (connectedRoom) {
      if (rooms[connectedRoom].filter((entry) => entry.video.id.videoId === video.id.videoId).length > 0) {
        return;
      }
      rooms[connectedRoom].push({video: video, votes: [socket.id], time: Date.now()});
    }
  });

  socket.on('vote', (data) => {
    if (connectedRoom) {
      if (data.videoUrl) {
        if (rooms[connectedRoom].filter((entry) => entry.video.id.videoId === data.videoUrl)[0].votes.includes(socket.id)) {
          return;
        }
        rooms[connectedRoom].filter((entry) => entry.video.id.videoId === data.videoUrl)[0].votes.push(socket.id);
        sortRoom(connectedRoom);
      }
    }
  });

  socket.on('unvote', (data) => {
    if (connectedRoom) {
      if (data.videoUrl) {
        rooms[connectedRoom] = rooms[connectedRoom].map((entry) => {
          entry.votes = entry.votes.filter((id) => {
            return id != socket.id
          });
          return entry;
        });
        sortRoom(connectedRoom);
      }
    }
  });

  socket.on('disconnect', function(reason) {
    console.log(`a user disconnected due to ${reason}`);
  });
});

server.listen(port, () => {
  console.log(`App listening on port ${port}!`);
});
