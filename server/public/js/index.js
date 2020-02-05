const socket = io();
socket.on("connect", () => {
  console.log('Connected to socket!');
});
socket.on("statusUpdate", (status) => {
  console.log("Status updated");
  console.log(status);
  document.querySelector("#currentlyPlaying").innerText = status.title;
  document.querySelector("#state").innerText = status.state;
  document.querySelector("#progress").innerText = `${status.progress} / ${status.duration}`;
  document.querySelector("#ad").hidden = !status.state.includes("ad");
});
socket.on("queueList", (list) => {
  const queue = document.querySelector("#videoQueue");
  queue.innerHTML = "";
  list.map((url) => {
    const entry = document.createElement("p");
    const text = document.createTextNode(url);
    entry.appendChild(text);
    queue.appendChild(entry);
  })
});

const roomCodeInput = document.querySelector("#roomCodeInput");
const joinRoomButton = document.querySelector("#joinRoomButton");
const skipAdButton = document.querySelector("#ad");
const videoInput = document.querySelector("#videoInput");
const submitVideoButton = document.querySelector("#submitVideoButton");

joinRoomButton.onclick = () => {
  socket.emit("joinRoom", roomCodeInput.value);
}

skipAdButton.onclick = () => {
  socket.emit("skipAd");
}

submitVideoButton.onclick = () => {
  socket.emit("addToQueue", videoInput.value);
}
