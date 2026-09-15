# AI Resume Builder

A production-ready resume builder with live preview, local autosave, deterministic ATS scoring, job-description keyword matching and optional AI assistance.

## Features

- Modern responsive editor
- Personal details, summary, experience, education, projects, skills and certifications
- Live resume preview
- Template selector
- Local autosave
- ATS score and keyword matching
- Job-description analysis
- AI summary generation
- AI experience bullet improvement endpoint
- AI job tailoring endpoint
- Print-ready PDF export
- Health endpoint for deployment monitoring
- Deployment-provided `PORT`; no hard-coded frontend localhost URL

## Run locally

```bash
npm install
npm start
```

For AI features, configure `OPENAI_API_KEY` in the environment. `OPENAI_MODEL` is optional and defaults to `gpt-4o-mini`.

## API

- `GET /health`
- `POST /api/ats/analyze`
- `POST /api/rewriteResume`
- `POST /api/ai/summary`
- `POST /api/ai/bullets`
- `POST /api/ai/tailor`

## Deployment

Use Node.js 18+ and the start command `npm start`. Configure `OPENAI_API_KEY` as a secret environment variable in the hosting provider. Never commit API keys.

The app serves the frontend and API from the same Node/Express process, so the browser does not need a separate backend URL.
