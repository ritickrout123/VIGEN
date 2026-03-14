# VIGEN Backend

FastAPI application and Celery worker foundation for the Phase 1 MVP.

## Main areas

- `app/api/` HTTP routes
- `app/core/` settings, logging, security
- `app/db/` engine, sessions, metadata
- `app/models/` SQLAlchemy entities
- `app/schemas/` request and response contracts
- `app/services/` business logic and provider abstractions
- `app/workers/` Celery app and tasks

