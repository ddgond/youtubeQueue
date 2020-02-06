const socket = io();
socket.on("connect", () => {
  console.log('Connected to socket!');
});
socket.on("statusUpdate", (status) => {
  console.log("Status updated");
  console.log(status);
  document.querySelector("#currentlyPlaying").innerText = status.title || "Nothing is playing.";
  document.querySelector("#state").innerText = status.state || "idle";
  document.querySelector("#progress").innerText = `${status.progress} / ${status.duration}`;
});
socket.on("queueList", (list) => {
  const queueParent = document.querySelector("#videoQueueDiv");
  if (list.length > 0) {
    showQueue(true);
  } else {
    showQueue(false);
  }
  const queue = document.querySelector("#videoQueue");
  queue.innerHTML = "";
  list.map((data) => {
    const div = document.createElement("div");
    div.className = "flex items-start justify-between mv3";
    const leftDiv = document.createElement("div");
    leftDiv.className = "flex items-start";
    const thumb = document.createElement("img");
    thumb.src = data.video.snippet.thumbnails.medium.url;
    thumb.className = "db br3 w5";
    const info = document.createElement("div");
    info.className = "mh3 measure";
    const title = document.createElement("p");
    title.innerText = data.video.snippet.title;
    title.className = "mv2";
    const channel = document.createElement("p");
    channel.innerText = data.video.snippet.channelTitle;
    channel.className = "f6 black-60 mv2";
    const desc = document.createElement("p");
    desc.innerText = data.video.snippet.description;
    desc.className = "f7 black-60 mv2";

    const rightDiv = document.createElement("div");
    rightDiv.className = "flex flex-column items-end";
    const votes = document.createElement("p");
    votes.innerText = `Votes: ${data.votes.length}`;
    votes.className = "mv2";
    const voteButton = document.createElement("button");
    voteButton.setAttribute("type", "button");
    voteButton.className = "b pv2 input-reset ba b--black bg-white pointer f6 dim";
    if (data.votes.includes(socket.id)) {
      voteButton.onclick = () => {
        socket.emit("unvote", {video: data.video});
      }
      voteButton.innerText = "Unvote";
    } else {
      voteButton.onclick = () => {
        socket.emit("vote", {video: data.video});
      }
      voteButton.innerText = "Vote";
    }

    leftDiv.appendChild(thumb);
    info.appendChild(title);
    info.appendChild(channel);
    info.appendChild(desc);
    leftDiv.appendChild(info);
    div.appendChild(leftDiv);

    rightDiv.appendChild(votes);
    rightDiv.appendChild(voteButton);

    div.appendChild(rightDiv);
    queue.appendChild(div);
  });
});
socket.on("searchResults", (results) => {
  showSearchResults(true);
  const searchResults = document.querySelector("#searchResults");
  searchResults.innerHTML = "";
  results.map((result) => {
    const onSelect = (evt) => {
      evt.stopPropagation();
      socket.emit("addToQueue", result);
      document.querySelector("#searchInput").value = "";
      showSearchResults(false);
    }
    const div = document.createElement("div");
    div.className = "flex items-center justify-between mv3 dim pointer"
    div.onclick = onSelect;
    const leftDiv = document.createElement("div");
    leftDiv.className = "flex items-start";
    const thumb = document.createElement("img");
    thumb.src = result.snippet.thumbnails.medium.url;
    thumb.className = "db br3 w5";
    const info = document.createElement("div");
    info.className = "mh3 measure";
    const title = document.createElement("p");
    title.innerText = result.snippet.title;
    title.className = "mv2";
    const channel = document.createElement("p");
    channel.innerText = result.snippet.channelTitle;
    channel.className = "f6 black-60 mv2";
    const desc = document.createElement("p");
    desc.innerText = result.snippet.description;
    desc.className = "f7 black-60 mv2";
    const selectButton = document.createElement("button");
    selectButton.setAttribute("type", "button");
    selectButton.onclick = onSelect;
    selectButton.innerText = "Add to Queue";
    selectButton.className = "b pv2 input-reset ba b--black bg-white dim pointer f6";

    leftDiv.appendChild(thumb);
    info.appendChild(title);
    info.appendChild(channel);
    info.appendChild(desc);
    leftDiv.appendChild(info);
    div.appendChild(leftDiv);
    div.appendChild(selectButton);
    searchResults.appendChild(div);
  });
})

const showSearchResults = (doShow) => {
  if (doShow) {
    document.querySelector("#searchResultsParent").hidden = false;
  } else {
    document.querySelector("#searchResults").innerHTML = "";
    document.querySelector("#searchResultsParent").hidden = true;
  }
}

const showQueue = (doShow) => {
  if (doShow) {
    document.querySelector("#videoQueueDiv").hidden = false;
  } else {
    document.querySelector("#videoQueue").innerHTML = "";
    document.querySelector("#videoQueueDiv").hidden = true;
  }
}

const roomCodeInput = document.querySelector("#roomCodeInput");
const joinRoomButton = document.querySelector("#joinRoomButton");
const skipAdButton = document.querySelector("#ad");
const searchInput = document.querySelector("#searchInput");
const submitSearchButton = document.querySelector("#submitSearchButton");

updateUI = (roomCode) => {
  if (roomCode) {
    document.querySelector("#connectedRoom").innerText = roomCode;
    document.querySelector("#connectedDiv").hidden = false;
    document.querySelector("#unconnectedDiv").hidden = true;
  } else {
    document.querySelector("#connectedRoom").innerText = "";
    document.querySelector("#connectedDiv").hidden = true;
    document.querySelector("#unconnectedDiv").hidden = false;
  }
}

joinRoomButton.onclick = () => {
  socket.emit("joinRoom", roomCodeInput.value);
  updateUI(roomCodeInput.value);
  document.querySelector("#roomCodeInput").value = "";
}

leaveRoomButton.onclick = () => {
  socket.emit("leaveRoom");
  updateUI(null);
  showQueue(false);
  showSearchResults(false);
  document.querySelector("#searchInput").value = "";
}

submitSearchButton.onclick = () => {
  socket.emit("search", searchInput.value);
}
