const defaultServerUrl = "http://3.20.138.223/";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({serverUrl: defaultServerUrl}, () => {
    console.log("Initial server url set.");
  });
  chrome.storage.sync.set({defaultServerUrl: defaultServerUrl}, () => {
    console.log("Default server url saved.");
  });
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: {hostEquals: 'www.youtube.com'}
          })
        ],
        actions: [
          new chrome.declarativeContent.ShowPageAction()
        ]
      }
    ]);
  });
});

let socket;

chrome.storage.sync.get('serverUrl', (data) => {
  socket = io(data.serverUrl);
  socket.on("connect", () => {
    console.log(`connected to ${data.serverUrl}`);
  });
  socket.on("playNextSong", (songUrl) => {
    console.log(`Playing song ${songUrl}`);
    chrome.tabs.query({url: "*://*.youtube.com/*"}, (tabs) => {
      if (tabs.length > 0) {
        const port = chrome.tabs.connect(tabs[0].id, {name:"fromServer"});
        port.postMessage({songUrl: songUrl});
      }
    });
  });
  socket.on("skipAd", () => {
    chrome.tabs.query({url: "*://*.youtube.com/*"}, (tabs) => {
      if (tabs.length > 0) {
        const port = chrome.tabs.connect(tabs[0].id, {name:"fromServer"});
        port.postMessage({skipAd: true});
      }
    });
  });
})

chrome.runtime.onConnect.addListener(port => {
  port.onMessage.addListener(msg => {
    if (port.name === "toServer") {
      if (msg.roomCode) {
        socket.emit("joinRoom", msg.roomCode);
      }
      if (msg.getNextSong) {
        socket.emit("getNextSong");
      }
      if (msg.statusUpdate) {
        socket.emit("statusUpdate", msg.statusUpdate);
      }
    }
  });
});
