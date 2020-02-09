const path = require('path');
const express = require('express');
const app = express();
const port = 3000;
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const scrapeSearch = require('scrape-youtube');
const fs = require('fs');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get('/whoami', (req, res) => {
  res.send({ip: req.header('X-Real-IP') || "::ffff:127.0.0.1"});
});

app.get('/socket.io/socket.io.js', (req, res) => {
  res.sendFile(path.join(__dirname, "node_modules/socket.io-client/dist/socket.io.js"));
});

app.use(express.static('public'));

rooms = {};

ytSearch = (searchTerm) => { // Returns a Promise
  fs.appendFile('searches.txt', searchTerm + "\n", (err) => {
    if (err) throw err;
  });
  const promise = new Promise((resolve, reject) => {
    scrapeSearch(searchTerm, {
      limit: 5,
      type: "video"
    }).then((results) => {
      results = results.map(result => {
        return {
          id: {videoId: result.link.slice(-11)},
          snippet: {
            title:result.title,
            description:result.description,
            thumbnails:{medium:{url:result.thumbnail}},
            channelTitle:result.channel,
            duration: result.duration,
            views: result.views
          }
        }
      });
      resolve(results);
    });
  });
  return promise;
}

sortRoom = (roomCode) => {
  rooms[roomCode].entries = rooms[roomCode].entries.filter((entry) => {
    return entry.votes.length - entry.downVotes.length >= 0;
  });
  rooms[roomCode].entries.sort((a, b) => {
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

playNextSong = (connectedRoom) => {
  if (connectedRoom) {
    if (rooms[connectedRoom].entries.length > 0) {
      io.to(connectedRoom).emit("playNextSong", `https://www.youtube.com/watch?v=${rooms[connectedRoom].entries.shift().video.id.videoId}`);
    } else {
      io.to(connectedRoom).emit("playNextSong", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    }
  }
}

addToQueue = (socket, connectedRoom, video) => {
  if (rooms[connectedRoom].entries.filter((entry) => entry.video.id.videoId === video.id.videoId).length > 0) {
    return;
  }
  rooms[connectedRoom].entries.push({video: video, votes: [socket.id], downVotes: [], time: Date.now()});
  sortRoom(connectedRoom);
  io.to(connectedRoom).emit("queueList", rooms[connectedRoom].entries);
}

getSkipRequirement = (connectedRoom) => {
  return Math.min(3,rooms[connectedRoom].users.length);
}

getSkipStatus = (connectedRoom) => {
  return {skipVotes: rooms[connectedRoom].skipVotes, skipVotesNeeded: getSkipRequirement(connectedRoom)};
}

skipCurrentSong = (connectedRoom) => {
  rooms[connectedRoom].skipVotes = [];
  playNextSong(connectedRoom);
}

io.on('connection', function(socket) {
  console.log('a user connected');
  let connectedRoom;

  socket.on('joinRoom', function(data) {
    const roomCode = data.roomCode;
    const ip = data.ip;
    if (ip === undefined) {
      // If hosting
      if (connectedRoom) {
        socket.leave(connectedRoom);
        console.log(`a host left room ${connectedRoom}`);
      }
      socket.join(roomCode);
      console.log(`a host joined room ${roomCode}`);
      connectedRoom = roomCode;
      rooms[connectedRoom] = {entries: [], state: {}, users: [], skipVotes: []};
      socket.emit("queueList", rooms[connectedRoom].entries);
      return;
    }
    if (connectedRoom) {
      socket.leave(connectedRoom);
      console.log(`a user left room ${connectedRoom}`);
    }
    socket.join(roomCode);
    console.log(`a user joined room ${roomCode}`);
    connectedRoom = roomCode;
    if (!rooms[connectedRoom]) {
      rooms[connectedRoom] = {entries: [], state: {}, users: [{id: socket.id, ip: ip}], skipVotes: []};
    }
    if (rooms[connectedRoom].users.filter((user) => user.ip === ip).length > 0) {
      rooms[connectedRoom].users = rooms[connectedRoom].users.map((user) => {
        if (user.ip === ip) {
          rooms[connectedRoom].entries = rooms[connectedRoom].entries.map(entry => {
            entry.votes = entry.votes.map(voter => {
              if (voter === user.id) {
                return socket.id; // Update votes to reflect connection from different socket
              }
              return voter;
            });
            return entry;
          });
          rooms[connectedRoom].skipVotes = rooms[connectedRoom].skipVotes.map(voter => {
            if (voter === user.id) {
              return socket.id;
            }
            return voter;
          })
          user.id = socket.id; // Update user to reflect connection from different socket
        }
        return user;
      });
    } else {
      rooms[connectedRoom].users.push({id: socket.id, ip: ip});
    }
    socket.emit("statusUpdate", rooms[connectedRoom].state);
    socket.emit("queueList", rooms[connectedRoom].entries);
    io.to(connectedRoom).emit("skipStatus", getSkipStatus(connectedRoom));
  });

  socket.on('leaveRoom', function() {
    if (connectedRoom && rooms[connectedRoom].users.filter(user=>user.id===socket.id).length > 0) {
      socket.leave(connectedRoom);
      console.log(`a user left room ${connectedRoom}`);
      connectedRoom = null;
    }
    else if (connectedRoom) {
      console.log(`a host left room ${connectedRoom}`);
    }
  });

  socket.on('getNextSong', function() {
    playNextSong(connectedRoom);
  });

  socket.on('statusUpdate', function(status) {
    if (connectedRoom) {
      rooms[connectedRoom].state = status;
      io.to(connectedRoom).emit("statusUpdate", rooms[connectedRoom].state);
      io.to(connectedRoom).emit("queueList", rooms[connectedRoom].entries);
    }
  });

  socket.on('search', (query) => {
    if (connectedRoom && rooms[connectedRoom].users.filter(user=>user.id===socket.id).length > 0) {
      ytSearch(query).then((results) => {
        socket.emit("searchResults", results);
      }, (err) => {
        console.error(err);
        socket.emit("searchResults", [
          {
            id:{videoId:'dQw4w9WgXcQ'},
            snippet:{
              title:'Never Gonna Give You Up',
              description:'Youtube scraping broke. Oops.',
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
    }
  });

  socket.on('feelingLucky', (query) => {
    if (connectedRoom && rooms[connectedRoom].users.filter(user=>user.id===socket.id).length > 0) {
      ytSearch(query).then((results) => {
        addToQueue(socket, connectedRoom, results[0]);
      }, (err) => {
        console.error(err);
        addToQueue(socket, connectedRoom, {
          id:{videoId:'dQw4w9WgXcQ'},
          snippet:{
            title:'Never Gonna Give You Up',
            description:'Youtube scraping broke. Oops.',
            thumbnails:{medium:{url:"https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg?sqp=-oaymwEZCNACELwBSFXyq4qpAwsIARUAAIhCGAFwAQ==&rs=AOn4CLCALyvNJwgrtG1GpHFugkV0e3jqdg"}},
            channelTitle:"Official Rick Astley"
          }
        });
      });
    }
  });

  socket.on('addToQueue', (video) => {
    if (connectedRoom && rooms[connectedRoom].users.filter(user=>user.id===socket.id).length > 0) {
      addToQueue(socket, connectedRoom, video);
    }
  });

  socket.on('vote', (data) => {
    if (connectedRoom && rooms[connectedRoom].users.filter(user=>user.id===socket.id).length > 0) {
      if (data.video.id.videoId) {
        if (rooms[connectedRoom].entries.filter((entry) => entry.video.id.videoId === data.video.id.videoId)[0].votes.includes(socket.id)) {
          return;
        }
        const vid = rooms[connectedRoom].entries.filter((entry) => entry.video.id.videoId === data.video.id.videoId)[0];
        vid.votes.push(socket.id);
        vid.downVotes = vid.downVotes.filter((id) => id != socket.id);
        sortRoom(connectedRoom);
        io.to(connectedRoom).emit("queueList", rooms[connectedRoom].entries);
      }
    }
  });

  socket.on('downvote', (data) => {
    if (connectedRoom && rooms[connectedRoom].users.filter(user=>user.id===socket.id).length > 0) {
      if (data.video.id.videoId) {
        if (rooms[connectedRoom].entries.filter((entry) => entry.video.id.videoId === data.video.id.videoId)[0].downVotes.includes(socket.id)) {
          return;
        }
        const vid = rooms[connectedRoom].entries.filter((entry) => entry.video.id.videoId === data.video.id.videoId)[0];
        vid.downVotes.push(socket.id);
        vid.votes = vid.votes.filter((id) => id != socket.id);
        sortRoom(connectedRoom);
        io.to(connectedRoom).emit("queueList", rooms[connectedRoom].entries);
      }
    }
  });

  socket.on('unvote', (data) => {
    if (connectedRoom && rooms[connectedRoom].users.filter(user=>user.id===socket.id).length > 0) {
      if (data.video.id.videoId) {
        rooms[connectedRoom].entries = rooms[connectedRoom].entries.map((entry) => {
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
        io.to(connectedRoom).emit("queueList", rooms[connectedRoom].entries);
      }
    }
  });

  socket.on('voteSkip', () => {
    if (connectedRoom && rooms[connectedRoom].users.filter(user=>user.id===socket.id).length > 0) {
      if (rooms[connectedRoom].skipVotes.filter((voter) => voter === socket.id).length > 0) {
        return;
      };
      rooms[connectedRoom].skipVotes.push(socket.id);
      if (rooms[connectedRoom].skipVotes.length >= getSkipRequirement(connectedRoom)) {
        skipCurrentSong(connectedRoom);
      }
      io.to(connectedRoom).emit("skipStatus", getSkipStatus(connectedRoom));
    }
  });

  socket.on('unvoteSkip', () => {
    if (connectedRoom && rooms[connectedRoom].users.filter(user=>user.id===socket.id).length > 0) {
      if (rooms[connectedRoom].skipVotes.filter((voter) => voter === socket.id).length > 0) {
        rooms[connectedRoom].skipVotes = rooms[connectedRoom].skipVotes.filter((voter) => voter != socket.id);
        io.to(connectedRoom).emit("skipStatus", getSkipStatus(connectedRoom));
      };
    }
  });

  socket.on('disconnect', function(reason) {
    console.log(`a user disconnected due to ${reason}`);
  });
});

server.listen(port, () => {
  console.log(`App listening on port ${port}!`);
});
