from fastapi import APIRouter

from app.api.routes import auth, jobs, presets, uploads


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(uploads.router, prefix="/api/uploads", tags=["uploads"])
api_router.include_router(presets.router, prefix="/api/presets", tags=["presets"])
api_router.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])

