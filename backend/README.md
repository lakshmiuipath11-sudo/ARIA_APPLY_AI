# ARIA Apply AI Backend

## Railway deployment

1. Push the repository to GitHub.
2. In Railway, create a project from the GitHub repository.
3. Set the Railway service **Root Directory** to:

```text
/backend
```

4. Add variables:

```text
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-5-mini
ALLOWED_ORIGINS=*
```

5. Deploy and generate a public Railway domain.

Health endpoint:

```text
https://YOUR-RAILWAY-DOMAIN/api/v1/health
```

Interactive API documentation:

```text
https://YOUR-RAILWAY-DOMAIN/docs
```

The API automatically falls back to its local rule mapper when no OpenAI key
is configured or the AI request fails.
