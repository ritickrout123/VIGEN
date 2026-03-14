import asyncio

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.services.jobs import JobService
from app.workers.celery_app import celery_app


async def _with_session(coro):
    async with AsyncSessionLocal() as session:  # type: AsyncSession
        return await coro(session)


@celery_app.task(name="jobs.analyse_and_plan")
def analyse_and_plan(job_id: str) -> None:
    asyncio.run(_with_session(lambda session: JobService().run_analysis_and_planning(session, job_id)))


@celery_app.task(name="jobs.render")
def render(job_id: str, scene_indexes: list[int] | None = None) -> None:
    asyncio.run(_with_session(lambda session: JobService().render_job(session, job_id, scene_indexes)))

