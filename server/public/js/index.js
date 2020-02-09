let ip;

fetch('/whoami').then((response) => {
  return response.json();
}).then((json) => {
  ip = json.ip;
});

const socket = io();
socket.on("connect", () => {
  console.log('Connected to socket!');
});
socket.on("statusUpdate", (status) => {
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
    div.className = "flex items-center mv3";

    const voteDiv = document.createElement("div");
    voteDiv.className = "flex flex-column items-center justify-center mr3";
    voteDiv.innerHTML = `
      <button type="button" class="input-reset grow bg-transparent bw0 pointer black-80 ${data.votes.includes(socket.id) ? "green" : ""}">
        <svg class="w2 h2" viewBox="0 0 128 64" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g id="icon-copy" fill="currentColor">
                    <polygon id="Path" points="64 0 0 64 128 64"></polygon>
                </g>
            </g>
        </svg>
      </button>
      <p class="mv0 nowrap">${data.votes.length - data.downVotes.length}</p>
      <button type="button" class="input-reset grow bg-transparent bw0 pointer black-80 ${data.downVotes.includes(socket.id) ? "red" : ""}">
        <svg class="w2 h2" viewBox="0 0 128 64" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g id="icon-copy-2" fill="currentColor">
                    <polygon id="Path-2" points="0 0 128 0 64 64"></polygon>
                </g>
            </g>
        </svg>
      </button>
      `;

    voteDiv.querySelectorAll("button")[0].onclick = () => {
      if (data.votes.includes(socket.id)) {
        if (data.votes.length - data.downVotes.length <= 0) {
          if (confirm("If the total votes reach -1, this video will be removed from the queue. Are you sure you wish to do this?")) {
            socket.emit("unvote", {video: data.video});
            voteDiv.querySelectorAll("button")[0].classList.remove("green");
          }
        } else {
          socket.emit("unvote", {video: data.video});
          voteDiv.querySelectorAll("button")[0].classList.remove("green");
        }
      } else {
        socket.emit("vote", {video: data.video});
        voteDiv.querySelectorAll("button")[0].classList.add("green");
      }
    }

    voteDiv.querySelectorAll("button")[1].onclick = () => {
      if (data.downVotes.includes(socket.id)) {
        socket.emit("unvote", {video: data.video});
        voteDiv.querySelectorAll("button")[0].classList.remove("red");
      } else {
        if (data.votes.length - data.downVotes.length == 0 || (data.votes.length - data.downVotes.length <= 1 && data.votes.includes(socket.id))) {
          if (confirm("If the total votes reach -1, this video will be removed from the queue. Are you sure you wish to do this?")) {
            socket.emit("downvote", {video: data.video});
            voteDiv.querySelectorAll("button")[0].classList.add("red");
          }
        } else {
          socket.emit("downvote", {video: data.video});
          voteDiv.querySelectorAll("button")[0].classList.add("red");
        }
      }
    }

    const videoDiv = document.createElement("div");
    videoDiv.className = "flex items-start";
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

    div.appendChild(voteDiv);

    videoDiv.appendChild(thumb);
    info.appendChild(title);
    info.appendChild(channel);
    info.appendChild(desc);
    videoDiv.appendChild(info);
    div.appendChild(videoDiv);

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
});
socket.on("skipStatus", (status) => {
  const skipVotesSpan = document.querySelector("#skipVotes");
  const skipVotesNeededSpan = document.querySelector("#skipVotesNeeded");
  const skipButton = document.querySelector("#skipButton");
  skipVotesSpan.innerText = status.skipVotes.length;
  skipVotesNeededSpan.innerText = status.skipVotesNeeded;
  if (status.skipVotes.includes(socket.id)) {
    skipButton.innerText = "Remove vote";
    skipButton.onclick = () => {
      socket.emit("unvoteSkip");
    }
  } else {
    skipButton.innerText = "Skip video";
    skipButton.onclick = () => {
      socket.emit("voteSkip");
    }
  }
});

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
const imFeelingLuckyButton = document.querySelector("#imFeelingLuckyButton");

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

cleanUp = () => {
  document.querySelector("#roomCodeInput").value = "";
  document.querySelector("#searchInput").value = "";
  document.querySelector("#currentlyPlaying").innerText = "Nothing is playing";
  document.querySelector("#state").innerText = "idle";
  document.querySelector("#progress").innerText = "0:00 / 0:00";
}

roomCodeInput.onkeyup = (evt) => {
  if (evt.keyCode === 13) {
    evt.preventDefault();
    joinRoomButton.click();
  }
}

joinRoomButton.onclick = () => {
  socket.emit("joinRoom", {roomCode: roomCodeInput.value, ip: ip});
  updateUI(roomCodeInput.value);
  cleanUp();
}

leaveRoomButton.onclick = () => {
  socket.emit("leaveRoom");
  updateUI(null);
  showQueue(false);
  showSearchResults(false);
  cleanUp();
}

searchInput.onkeyup = (evt) => {
  if (evt.keyCode === 13) {
    evt.preventDefault();
    submitSearchButton.click();
  }
}

submitSearchButton.onclick = () => {
  socket.emit("search", searchInput.value);
}

imFeelingLuckyButton.onclick = () => {
  socket.emit("feelingLucky", searchInput.value);
}
