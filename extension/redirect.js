chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(msg => {
    console.log(msg);
    if (port.name === "fromServer") {
      if (msg.songUrl) {
        window.location = msg.songUrl;
      }
    }
  });
});
