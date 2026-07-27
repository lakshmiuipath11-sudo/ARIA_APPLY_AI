import {
  scanDocument
} from "../scanner/domScanner";

import {
  autofill
} from "../autofill/autofillEngine";

import type {
  CandidateProfile,
  ScanResult
} from "../types";

chrome.runtime.onMessage.addListener(
  (
    message,
    _sender,
    sendResponse
  ) => {
    if (
      message?.type === "ARIA_SCAN_PAGE"
    ) {
      sendResponse({
        ok: true,
        data: scanDocument()
      });

      return;
    }

    if (
      message?.type === "ARIA_AUTOFILL"
    ) {
      const scan: ScanResult =
        message.scan ?? scanDocument();

      const filled = autofill(
        scan,
        message.profile as CandidateProfile
      );

      sendResponse({
        ok: true,
        filled,
        scan
      });

      return;
    }
  }
);

let mutationTimer:
  number | undefined;

const observer =
  new MutationObserver(() => {
    window.clearTimeout(
      mutationTimer
    );

    mutationTimer =
      window.setTimeout(() => {
        chrome.runtime.sendMessage({
          type: "ARIA_PAGE_CHANGED",
          fieldCount:
            scanDocument().fields.length
        }).catch(() => undefined);
      }, 700);
  });

observer.observe(
  document.documentElement,
  {
    childList: true,
    subtree: true,
    attributes: false
  }
);
