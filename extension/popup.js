// let changeColor = document.querySelector("#changeColor");
//
// chrome.storage.sync.get('color', (data) => {
//   changeColor.style.backgroundColor = data.color;
//   changeColor.setAttribute('value', data.color);
// });
//
// changeColor.onclick = (event) => {
//   let color = event.target.value;
//   chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
//     chrome.tabs.executeScript(
//       tabs[0].id,
//       {file: 'onClick.js'}
//     );
//   })
// }

// Just for testing purposes

const nextSongButton = document.querySelector("#nextSong");
const joinRoomButton = document.querySelector("#joinRoom");
const leaveRoomButton = document.querySelector("#leaveRoom");
const roomCodeInput = document.querySelector("#roomCode");
const port = chrome.runtime.connect({name: "toServer"});

nextSongButton.onclick = (event) => {
  port.postMessage({getNextSong: true});
  // chrome.tabs.query({url: "*://*.youtube.com/*"}, (tabs) => {
  //   if (tabs.length > 0) {
  //     getNextSong().then(nextSongUrl => {
  //       console.log("hi");
  //       chrome.tabs.update(
  //         tabs[0].id,
  //         {url: nextSongUrl}
  //       );
  //     });
  //   }
  // });
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

chrome.storage.sync.get('hostRoomCode', (data) => {
  updateUI(data.hostRoomCode);
});
