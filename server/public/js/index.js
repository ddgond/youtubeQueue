const socket = io();
socket.on("connect", () => {
  console.log('Connected to socket!');
});
socket.on("statusUpdate", (status) => {
  console.log("Status updated");
  console.log(status);
  document.querySelector("#currentlyPlaying").innerText = status.title;
  document.querySelector("#state").innerText = status.state;
  document.querySelector("#progress").innerText = `${status.progress} / ${status.duration}`;
  document.querySelector("#ad").hidden = !status.state.includes("ad");
});
socket.on("queueList", (list) => {
  const queue = document.querySelector("#videoQueue");
  queue.innerHTML = "";
  list.map((data) => {
    const div = document.createElement("div");
    const title = document.createElement("p");
    const titleText = document.createTextNode(data.video.snippet.title);
    const votes = document.createElement("p");
    const voteText = document.createTextNode(`Votes: ${data.votes.length}`);
    const voteButton = document.createElement("button");
    voteButton.setAttribute("type", "button");
    voteButton.onclick = () => {
      socket.emit("vote", {video: data.video});
    }
    if (data.votes.includes(socket.id)) {
      voteButton.disabled = true;
    }
    voteButton.innerText = "Vote";

    title.appendChild(titleText);
    div.appendChild(title);
    votes.appendChild(voteText);
    div.appendChild(votes);
    div.appendChild(voteButton);
    queue.appendChild(div);
  });
});
socket.on("searchResults", (results) => {
  const searchResults = document.querySelector("#searchResults");
  searchResults.innerHTML = "";
  results.map((result) => {
    const div = document.createElement("div");
    const title = document.createElement("p");
    title.innerText = result.snippet.title;
    const selectButton = document.createElement("button");
    selectButton.setAttribute("type", "button");
    selectButton.onclick = () => {
      socket.emit("addToQueue", result);
      document.querySelector("#searchResults").innerHTML = "";
    }
    selectButton.innerText = "Submit Video";

    div.appendChild(title);
    div.appendChild(selectButton);
    searchResults.appendChild(div);
  });
})

const roomCodeInput = document.querySelector("#roomCodeInput");
const joinRoomButton = document.querySelector("#joinRoomButton");
const skipAdButton = document.querySelector("#ad");
// const videoInput = document.querySelector("#videoInput");
// const submitVideoButton = document.querySelector("#submitVideoButton");
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
}

leaveRoomButton.onclick = () => {
  socket.emit("leaveRoom");
  updateUI(null);
}

skipAdButton.onclick = () => {
  socket.emit("skipAd");
}

submitSearchButton.onclick = () => {
  socket.emit("search", searchInput.value);
}
