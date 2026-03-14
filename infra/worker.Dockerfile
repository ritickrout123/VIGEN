FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY backend/pyproject.toml /app/backend/pyproject.toml
RUN pip install --no-cache-dir hatchling && pip install --no-cache-dir /app/backend

COPY backend /app/backend

WORKDIR /app/backend

CMD ["celery", "-A", "app.workers.celery_app.celery_app", "worker", "--loglevel=info"]

