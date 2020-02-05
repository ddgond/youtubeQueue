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

joinRoomButton.onclick = (event) => {
  if (roomCodeInput.value != "") {
    port.postMessage({roomCode: roomCodeInput.value});
  }
}
