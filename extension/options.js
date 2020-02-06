const saveButton = document.getElementById('saveUrlButton');
const serverUrlInput = document.querySelector("#serverUrlInput");
const defaultServerReminder = document.querySelector("#defaultServerReminder");
const saveStatus = document.getElementById('saveStatus');
let currentUrl = "";

chrome.storage.sync.get('serverUrl', (data) => {
  serverUrlInput.value = data.serverUrl;
  currentUrl = data.serverUrl;
})

chrome.storage.sync.get('defaultServerUrl', (data) => {
  defaultServerReminder.innerText = "Default server is " + data.defaultServerUrl;
})

serverUrlInput.onkeyup = (evt) => {
  if (evt.keyCode === 13) {
    evt.preventDefault();
    saveButton.click();
    return;
  }
  if (serverUrlInput.value != currentUrl) {
    saveStatus.innerText = "Changes have not been saved.";
    saveStatus.style.color = "orange";
  } else {
    saveStatus.innerText = "";
    saveStatus.style.color = "black";
  }
};

saveButton.addEventListener('click', () => {
  saveStatus.innerText = "Saving server URL...";
  saveStatus.style.color = "orange";
  currentUrl = serverUrlInput.value;
  chrome.storage.sync.set(
    {serverUrl: serverUrlInput.value},
    () => {
      if (chrome.runtime.lastError) {
        saveStatus.innerText = "Failed to save server URL.";
        saveStatus.style.color = "red";
      } else {
        saveStatus.innerText = "Successfully saved server URL.";
        saveStatus.style.color = "green";
      }
    }
  );
});
