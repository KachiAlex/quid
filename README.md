# Quid

AI-powered financial optimisation and switching platform for UK consumers.

## Architecture

| Service | Tech | Port | Description |
|---------|------|------|-------------|
| `frontend` | React 18 + TypeScript + Vite + Tailwind | 5173 | Web application (responsive, PWA) |
| `backend` | Node.js 20 + Express + TypeScript | 3000 | API server, auth, Open Banking orchestration |
| `ai-service` | Python 3.11 + FastAPI | 8000 | Transaction classification pipeline |

## Local Development

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose

### Quick Start

```bash
# Start infrastructure (Postgres, Redis)
docker compose up -d

# Install & run backend
cd backend && npm install && npm run dev

# Install & run frontend
cd frontend && npm install && npm run dev

# Install & run AI service
cd ai-service && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt && uvicorn app.main:app --reload
```

## Project Phases

See the project todo list for task tracking.
