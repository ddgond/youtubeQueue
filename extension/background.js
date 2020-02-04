const defaultServerUrl = "http://www.example.com";

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
