from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.base import Base
from app.db.session import engine, AsyncSessionLocal
from app.services.bootstrap import seed_style_presets


settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await seed_style_presets(session)
    yield


app = FastAPI(title=settings.project_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)
app.mount("/media", StaticFiles(directory=settings.filesystem_storage_root), name="media")


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}

