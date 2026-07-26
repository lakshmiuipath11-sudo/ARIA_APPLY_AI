# ARIA Apply AI Chrome Extension

This extension is built entirely in GitHub Actions. VS Code and local Node.js
are not required.

## Cloud build

1. Upload the repository to GitHub.
2. Open the repository's **Actions** tab.
3. Open **Build Chrome Extension**.
4. Select **Run workflow**.
5. Wait for the workflow to complete.
6. Open the successful workflow run.
7. Download the artifact named:

```text
aria-apply-ai-extension
```

8. Extract the downloaded artifact. It contains:

```text
aria-apply-ai-extension.zip
```

9. Extract that ZIP into a folder such as:

```text
C:\Users\sony\Desktop\lakshminarayana.eluri\Hackathon\ARIA_EXTENSION
```

10. Open Chrome:

```text
chrome://extensions
```

11. Enable **Developer mode**.
12. Select **Load unpacked**.
13. Choose the extracted `ARIA_EXTENSION` folder containing `manifest.json`.

## Live backend

The default backend is already configured as:

```text
https://ariaapplyai-production.up.railway.app
```

## Test flow

1. Open a job application page.
2. Open ARIA's side panel.
3. Select **Test Railway Backend**.
4. Select **Scan Page**.
5. Select **Run Semantic Mapping**.
6. Enter or save a candidate profile.
7. Select **Autofill Fields**.
8. Review all values manually.

ARIA never submits an application automatically.
