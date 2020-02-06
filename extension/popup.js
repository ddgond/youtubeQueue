const nextSongButton = document.querySelector("#nextSong");
const joinRoomButton = document.querySelector("#joinRoom");
const leaveRoomButton = document.querySelector("#leaveRoom");
const roomCodeInput = document.querySelector("#roomCode");
const port = chrome.runtime.connect({name: "toServer"});

nextSongButton.onclick = (event) => {
  port.postMessage({getNextSong: true});
}

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

updateServerUrl = (url) => {
  document.querySelector("#serverUrl").innerText = `Connected to server at ${url}.`;
}

roomCodeInput.onkeyup = (evt) => {
  if (evt.keyCode === 13) {
    evt.preventDefault();
    joinRoomButton.click();
  }
}

joinRoomButton.onclick = (event) => {
  if (roomCodeInput.value != "") {
    port.postMessage({roomCode: roomCodeInput.value});
    chrome.storage.sync.set({
      hostRoomCode:roomCodeInput.value
    });
    updateUI(roomCodeInput.value);
  }
}

leaveRoomButton.onclick = (event) => {
  port.postMessage({leaveRoom: true});
  chrome.storage.sync.set({
    hostRoomCode:null
  });
  updateUI(null);
}

chrome.storage.sync.get('serverUrl', (data) => {
  updateServerUrl(data.serverUrl);
});

chrome.storage.sync.get('hostRoomCode', (data) => {
  updateUI(data.hostRoomCode);
});
