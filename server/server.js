const path = require('path');
const express = require('express');
const app = express();
const port = 3000;
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const { YoutubeDataAPI } = require("youtube-v3-api");
const youtube = "AIzaSyDY88lH4lop431dP6hYrKvqpXM4L1aTDnAs"; // substring last char to prevent scraping of key, yes this is terrible practice
const ytKey = youtube.substring(0, youtube.length - 1);
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
    }, (err) => {
      reject(new Error('Failed to get video data.'));
    });
  });
}

sortRoom = (roomCode) => {
  rooms[roomCode].sort((a, b) => {
    if (a.votes.length - a.downVotes.length > b.votes.length - b.downVotes.length) {
      return -1;
    }
    if (a.votes.length - a.downVotes.length < b.votes.length - b.downVotes.length) {
      return 1;
    }
    if (a.votes.length - a.downVotes.length === b.votes.length - b.downVotes.length) {
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
    socket.emit("queueList", rooms[connectedRoom]);
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
    }, (err) => {
      console.error(err);
      socket.emit("searchResults", [
        {
          id:{videoId:'dQw4w9WgXcQ'},
          snippet:{
            title:'Never Gonna Give You Up',
            description:'Youtube API broke. Oops.',
            thumbnails:{medium:{url:"https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg?sqp=-oaymwEZCNACELwBSFXyq4qpAwsIARUAAIhCGAFwAQ==&rs=AOn4CLCALyvNJwgrtG1GpHFugkV0e3jqdg"}},
            channelTitle:"Official Rick Astley"
          }
        },
        {
          id:{videoId:'ytWz0qVvBZ0'},
          snippet:{
            title:'Diggy Diggy Hole',
            description:'Choose from these songs in the meantime.',
            thumbnails:{medium:{url:"https://i.ytimg.com/vi/ytWz0qVvBZ0/hqdefault.jpg?sqp=-oaymwEZCNACELwBSFXyq4qpAwsIARUAAIhCGAFwAQ==&rs=AOn4CLCU7BORagYn09I2MvD4wZd_t1nklw"}},
            channelTitle:"YOGSCAST Lewis & Simon"
          }
        }
      ]);
    });
  });

  socket.on('addToQueue', (video) => {
    if (connectedRoom) {
      if (rooms[connectedRoom].filter((entry) => entry.video.id.videoId === video.id.videoId).length > 0) {
        return;
      }
      rooms[connectedRoom].push({video: video, votes: [socket.id], downVotes: [], time: Date.now()});
      io.to(connectedRoom).emit("queueList", rooms[connectedRoom]);
    }
  });

  socket.on('vote', (data) => {
    if (connectedRoom) {
      console.log(data);
      if (data.video.id.videoId) {
        if (rooms[connectedRoom].filter((entry) => entry.video.id.videoId === data.video.id.videoId)[0].votes.includes(socket.id)) {
          return;
        }
        const vid = rooms[connectedRoom].filter((entry) => entry.video.id.videoId === data.video.id.videoId)[0]
        vid.votes.push(socket.id);
        vid.downVotes = vid.downVotes.filter((id) => id != socket.id);
        sortRoom(connectedRoom);
        io.to(connectedRoom).emit("queueList", rooms[connectedRoom]);
      }
    }
  });

  socket.on('downvote', (data) => {
    if (connectedRoom) {
      console.log(data);
      if (data.video.id.videoId) {
        if (rooms[connectedRoom].filter((entry) => entry.video.id.videoId === data.video.id.videoId)[0].downVotes.includes(socket.id)) {
          return;
        }
        const vid = rooms[connectedRoom].filter((entry) => entry.video.id.videoId === data.video.id.videoId)[0]
        vid.downVotes.push(socket.id);
        vid.votes = vid.votes.filter((id) => id != socket.id);
        sortRoom(connectedRoom);
        io.to(connectedRoom).emit("queueList", rooms[connectedRoom]);
      }
    }
  });

  socket.on('unvote', (data) => {
    if (connectedRoom) {
      if (data.video.id.videoId) {
        rooms[connectedRoom] = rooms[connectedRoom].map((entry) => {
          if (entry.video.id.videoId === data.video.id.videoId) {
            entry.votes = entry.votes.filter((id) => {
              return id != socket.id;
            });
            entry.downVotes = entry.downVotes.filter((id) => {
              return id != socket.id;
            });
          }
          return entry;
        });
        sortRoom(connectedRoom);
        io.to(connectedRoom).emit("queueList", rooms[connectedRoom]);
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
