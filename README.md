# VIGEN

Monorepo scaffold for the VIGEN Phase 1 MVP:

- `backend/` FastAPI API, domain services, SQLAlchemy models, and Celery workers
- `frontend/` Next.js App Router UI shell
- `infra/` Dockerfiles and local compose references
- `docs/` product and architecture source material

## Quick start

1. Copy `.env.example` to `.env`
2. Install backend dependencies from `backend/pyproject.toml`
3. Install frontend dependencies from `frontend/package.json`
4. Start the API, worker, and frontend

## Current implementation status

This workspace now includes the Phase 1 foundation:

- JWT auth contracts
- job, scene, and storyboard schemas
- Celery task scaffolding for analysis, planning, rendering, and assembly
- provider abstraction with mock-friendly defaults
- Next.js pages for auth, dashboard, create, job detail, and storyboard review
- Docker and compose skeleton for local development

External providers such as Claude, Gemini, Kling, R2, and SendGrid are wrapped behind services and default to mock-safe behavior until credentials and runtime dependencies are installed.

