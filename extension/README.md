# ARIA Apply AI — Sprint 1 Extension Foundation

This MVP includes:

- Chrome/Edge Manifest V3 extension
- React + TypeScript + Vite
- Popup UI
- Side Panel UI
- Universal visible-field DOM scanner
- Rule-based semantic field classifier
- MutationObserver support for dynamic forms
- Local candidate profile storage
- Autofill engine with React-compatible native value updates
- Human review before submission

## Run

```bash
cd extension
npm install
npm run build
```

Then:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the generated `extension/dist` folder.
5. Open a job application page.
6. Select the ARIA extension and scan the page.
7. Open the side panel, save a profile, and run autofill.

## Current limitations

- No backend or OpenAI call yet.
- Resume upload/parsing is not included in Sprint 1.
- File inputs are detected but never filled automatically.
- Closed shadow DOM cannot be scanned.
- Cross-origin iframe fields require additional permissions and frame handling.
- The extension never submits a form automatically.

## Next sprint

Add FastAPI, OpenAI semantic mapping, resume parsing, and confidence-based human approval.
