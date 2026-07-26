import type { CandidateProfile, ScanResult } from "../types";

async function activeTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active browser tab found.");
  return tab;
}

export async function scanActivePage(): Promise<ScanResult> {
  const tab = await activeTab();
  const response = await chrome.tabs.sendMessage(tab.id!, {
    type: "ARIA_SCAN_PAGE"
  });
  if (!response?.ok) throw new Error("Unable to scan this page.");
  return response.data as ScanResult;
}

export async function autofillActivePage(profile: CandidateProfile): Promise<number> {
  const tab = await activeTab();
  const response = await chrome.tabs.sendMessage(tab.id!, {
    type: "ARIA_AUTOFILL",
    profile
  });
  if (!response?.ok) throw new Error("Unable to autofill this page.");
  return Number(response.filled ?? 0);
}

export async function openSidePanel(): Promise<void> {
  const tab = await activeTab();
  if (!tab.windowId) throw new Error("No browser window found.");
  await chrome.sidePanel.open({ windowId: tab.windowId });
}
