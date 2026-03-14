.PHONY: backend frontend worker

backend:
	cd backend && python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm run dev

worker:
	cd backend && celery -A app.workers.celery_app.celery_app worker -l info

