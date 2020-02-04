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
let nextSongButton = document.querySelector("#nextSong");

// TODO: add listeners using executeScript that can determine when a video ends
nextSongButton.onclick = (event) => {
  chrome.tabs.query({url: "*://*.youtube.com/*"}, (tabs) => {
    if (tabs.length > 0) {
      getNextSong().then(nextSongUrl => {
        chrome.tabs.update(
          tabs[0].id,
          {url: nextSongUrl}
        );
      });
    }
  })
}
