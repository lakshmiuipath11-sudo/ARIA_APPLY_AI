chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === "ARIA_OPEN_SIDE_PANEL" && sender.tab?.windowId) {
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
  }
});
