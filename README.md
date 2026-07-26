# ARIA APPLY AI

AI-powered universal job-application assistant with semantic form
understanding, intelligent autofill, and human-in-the-loop validation.

## Live API

```text
https://ariaapplyai-production.up.railway.app
```

Health:

```text
https://ariaapplyai-production.up.railway.app/api/v1/health
```

Swagger:

```text
https://ariaapplyai-production.up.railway.app/docs
```

## Build the Chrome extension without VS Code

1. Open the GitHub repository.
2. Select **Actions**.
3. Select **Build Chrome Extension**.
4. Select **Run workflow**.
5. Download the `aria-apply-ai-extension` artifact.
6. Extract the ZIP.
7. Load the extracted folder using `chrome://extensions`.

See `extension/README.md` for full instructions.

## Current workflow

```text
Job Application Page
        ↓
Chrome DOM Scanner
        ↓
Railway FastAPI Semantic Mapper
        ↓
Canonical Candidate Fields
        ↓
Human-reviewed Autofill
```

ARIA never submits a job application automatically.
