# RBS Academic Assistant

Dual-agent academic assistant for Rutgers Business School — module recommendations and virtual TA grounded in lecture transcripts.

## Features

- **Intent router** — classifies each message as recommendation or content question
- **Module Recommender** — catalog-only recommendations with closed-set ID validation; career mode with job data waterfall
- **Virtual TA** — sealed agent answering only from one module's lecture transcripts
- **Agent pill** — live indicator of which agent is answering
- **Thread sidebar** — 5 recent threads persisted in browser localStorage
- **Voice input** — Web Speech API transcription into composer
- **Context Studio** — admin portal for per-agent RAG source management

## Setup

```bash
npm install
cp .env.example .env.local
# Add your OPENAI_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for chat, [http://localhost:3000/admin](http://localhost:3000/admin) for Context Studio (default password: `changeme`).

## Environment

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (server-side only) |
| `ADMIN_PASSWORD` | Context Studio login password |
| `ROUTER_MODEL` | Fast model for intent routing (default: gpt-4.1-mini) |
| `AGENT_MODEL` | Model for agents (default: gpt-4.1) |
| `CONTEXT_BUDGET` | Token budget for context meter (default: 100000) |

## Data

Module catalog and lecture transcripts live in `data/catalog.json` (92 modules).

## Architecture

```
Student → Intent Router → Module Recommender (web allowed for career)
                       → Virtual TA (no web, one module)
Admin → Context Studio → per-agent CSV/JSON/PDF sources
```
