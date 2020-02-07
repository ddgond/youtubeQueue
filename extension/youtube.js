// {
//  state: (loading, playing, paused, adPlaying, adPaused)
//  progress: 0 if loading, progress through video otherwise
//  duration: 0 if loading, adPlaying, adPaused, video duration otherwise
//  title: title of current video
// }

twoDigit = (n) => {
  return (n.toString().length == 1) ? `0${n}` : n;
}

convertTime = (seconds) => {
  let s = 0;
  let m = 0;
  let h = 0;
  while (seconds >= 3600) {
    seconds -= 3600;
    h += 1;
  }
  while (seconds >= 60) {
    seconds -= 60;
    m += 1;
  }
  s = Math.floor(seconds);
  if (h > 0) {
    return `${h}:${twoDigit(m)}:${twoDigit(s)}`;
  }
  return `${m}:${twoDigit(s)}`;
}

const toServerPort = chrome.runtime.connect({name: "toServer"});
setInterval(() => {
  sendStatusToServer();
}, 1000);

let requestedNextSong = false;

sendStatusToServer = () => {
  const ad = document.querySelector(".ytp-ad-player-overlay") != null;
  const playButton = document.querySelector(".ytp-play-button");
  const playState = playButton.getAttribute("title") ? playButton.getAttribute("title") : "";
  const videoPlayer = document.querySelector("video");
  const currentTime = convertTime(videoPlayer.currentTime);
  const duration = convertTime(videoPlayer.duration);
  if (!ad && videoPlayer.duration - videoPlayer.currentTime < 1.05 && !requestedNextSong) {
    requestedNextSong = true;
    setTimeout(() => {
      toServerPort.postMessage({getNextSong: true});
    }, 1000);
  }
  const title = document.querySelector(".title").innerText;
  const state = {
    state: `${ad ? "ad-" : ""}${(playState.toLowerCase().includes("play")) ? "paused" : "playing"}`,
    progress: currentTime,
    duration: duration,
    title: title
  };
  toServerPort.postMessage({statusUpdate: state});
}

skipAd = () => {
  document.querySelector(".ytp-ad-skip-button-slot").click();
}

chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(msg => {
    console.log(msg);
    if (port.name === "fromServer") {
      if (msg.skipAd) {
        skipAd();
      }
      if (msg.songUrl) {
        console.log(msg.songUrl);
        window.location = msg.songUrl;
      }
    }
  });
});
