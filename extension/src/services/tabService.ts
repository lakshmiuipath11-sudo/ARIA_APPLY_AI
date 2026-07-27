import type {
  CandidateProfile,
  ScanResult
} from "../types";

async function activeTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    throw new Error(
      "No active browser tab found."
    );
  }

  if (
    tab.url?.startsWith("chrome://") ||
    tab.url?.startsWith("edge://") ||
    tab.url?.startsWith("about:")
  ) {
    throw new Error(
      "Open a normal job application page before using ARIA."
    );
  }

  return tab;
}

async function sendToContentScript<T>(
  tabId: number,
  message: object
): Promise<T> {
  try {
    return await chrome.tabs.sendMessage(
      tabId,
      message
    ) as T;
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["assets/content.js"]
    });

    return await chrome.tabs.sendMessage(
      tabId,
      message
    ) as T;
  }
}

export async function scanActivePage():
Promise<ScanResult> {
  const tab = await activeTab();

  const response =
    await sendToContentScript<{
      ok: boolean;
      data: ScanResult;
    }>(
      tab.id!,
      {
        type: "ARIA_SCAN_PAGE"
      }
    );

  if (!response?.ok) {
    throw new Error(
      "Unable to scan this page."
    );
  }

  return response.data;
}

export async function autofillActivePage(
  profile: CandidateProfile,
  scan?: ScanResult
): Promise<number> {
  const tab = await activeTab();

  const response =
    await sendToContentScript<{
      ok: boolean;
      filled: number;
    }>(
      tab.id!,
      {
        type: "ARIA_AUTOFILL",
        profile,
        scan
      }
    );

  if (!response?.ok) {
    throw new Error(
      "Unable to autofill this page."
    );
  }

  return Number(response.filled ?? 0);
}

export async function openSidePanel():
Promise<void> {
  const tab = await activeTab();

  if (!tab.windowId) {
    throw new Error(
      "No browser window found."
    );
  }

  await chrome.sidePanel.open({
    windowId: tab.windowId
  });
}
