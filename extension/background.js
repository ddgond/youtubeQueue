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
let lastRequestTime = 0;
const requestCooldown = 4000;

chrome.storage.sync.set({
  hostRoomCode:null
});

const connectToSocketServer = (url) => {
  chrome.storage.sync.set({
    hostRoomCode:null
  });
  if (socket) {
    socket.disconnect();
  }
  console.log("attempting connection");
  socket = io(url);
  socket.on("connect", () => {
    console.log(`connected to ${url}`);
  });
  socket.on("playNextSong", (songUrl) => {
    console.log(`Playing song ${songUrl}`);
    chrome.tabs.query({url: "*://*.youtube.com/*"}, (tabs) => {
      if (tabs.length > 0) {
        const port = chrome.tabs.connect(tabs[0].id, {name:"fromServer"});
        port.postMessage({songUrl: songUrl});
      } else {
        chrome.tabs.create({url: songUrl});
      }
    });
  });
  socket.on("queueList", (list) => {
    chrome.tabs.query({url: "*://*.youtube.com/*"}, (tabs) => {
      if ((tabs.length == 0 || !(tabs[0].url.includes("watch?v="))) && list.length > 0) {
        if (Date.now() - lastRequestTime > requestCooldown) {
          socket.emit("getNextSong");
          lastRequestTime = Date.now();
        }
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
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (changes.serverUrl) {
    connectToSocketServer(changes.serverUrl.newValue);
  }
});

chrome.storage.sync.get('serverUrl', (data) => {
  connectToSocketServer(data.serverUrl);
})

chrome.runtime.onConnect.addListener(port => {
  port.onMessage.addListener(msg => {
    if (port.name === "toServer") {
      if (msg.roomCode) {
        socket.emit("joinRoom", msg.roomCode);
      }
      if (msg.leaveRoom) {
        socket.emit("leaveRoom");
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
