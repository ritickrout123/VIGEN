FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY backend/pyproject.toml /app/backend/pyproject.toml
RUN pip install --no-cache-dir hatchling && pip install --no-cache-dir /app/backend

COPY backend /app/backend

WORKDIR /app/backend

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

