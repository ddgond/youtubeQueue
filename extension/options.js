const saveButton = document.getElementById('saveUrlButton');
const serverUrlInput = document.querySelector("#serverUrlInput");
const defaultServerReminder = document.querySelector("#defaultServerReminder");
const saveStatus = document.getElementById('saveStatus');

chrome.storage.sync.get('serverUrl', (data) => {
  serverUrlInput.value = data.serverUrl;
})

chrome.storage.sync.get('defaultServerUrl', (data) => {
  defaultServerReminder.innerText = "Default server is " + data.defaultServerUrl;
})

saveButton.addEventListener('click', () => {
  saveStatus.innerText = "Saving server URL...";
  saveStatus.style.color = "orange";
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
