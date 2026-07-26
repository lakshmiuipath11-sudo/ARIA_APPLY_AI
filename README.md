# ARIA APPLY AI

Hackathon MVP for universal job-application form understanding and assisted
autofill.

## Included

- Manifest V3 Chrome/Edge extension
- React + TypeScript popup and side panel
- Universal DOM scanner
- Rule-based browser field extraction
- FastAPI semantic-mapping backend
- Optional OpenAI mapping with automatic rule fallback
- Railway deployment configuration
- Local candidate profile storage
- Human review before submission

## Cloud workflow

1. Upload this project to a GitHub repository.
2. Connect that repository to Railway.
3. Configure the Railway service root directory as `/backend`.
4. Add `OPENAI_API_KEY` and deploy.
5. Build the extension using GitHub Codespaces or GitHub Actions.
6. Download the extension build artifact and load it in Chrome.

Read `backend/README.md` and `extension/README.md`.
