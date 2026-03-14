import logging
from contextlib import asynccontextmanager

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.session import engine, AsyncSessionLocal
from app.services.bootstrap import seed_style_presets

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_alembic_head() -> str | None:
    """Return the head revision ID from Alembic scripts."""
    try:
        alembic_cfg = Config("alembic.ini")
        script = __import__("alembic.script", fromlist=["ScriptDirectory"]).ScriptDirectory.from_config(alembic_cfg)
        heads = script.get_heads()
        return heads[0] if heads else None
    except Exception as exc:
        logger.warning("Could not determine Alembic head revision: %s", exc)
        return None


async def _check_alembic_revision() -> None:
    """Warn if the database schema is not at the latest Alembic revision."""
    try:
        async with engine.connect() as conn:
            current_rev = await conn.run_sync(
                lambda sync_conn: MigrationContext.configure(sync_conn).get_current_revision()
            )
        head_rev = _get_alembic_head()
        if head_rev and current_rev != head_rev:
            logger.warning(
                "Database schema is NOT at the latest Alembic revision. "
                "Current: %s, Head: %s. Run `alembic upgrade head` to migrate.",
                current_rev,
                head_rev,
            )
        else:
            logger.info("Database schema is up to date (revision: %s).", current_rev)
    except Exception as exc:
        logger.warning("Could not check Alembic revision: %s", exc)


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    await _check_alembic_revision()
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

