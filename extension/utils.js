// TODO: take next song from server queue, inform server on success so server can remove from queue
getNextSong = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get('serverUrl', (data) => {
      // resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      resolve(data.serverUrl);
    });
  });
}

// TODO: tell the server the progress of the video
updateSongProgress = (state) => {
  // state has:
  // {
  //  state: (playing, paused, adPlaying, adPaused)
  //  progress: 0 if loading, progress through video otherwise
  //  duration: 0 if loading, adPlaying, adPaused, video duration otherwise
  //  title: title of current video
  // }
  //
  // returns true on success, false on failure
  return true;
}
