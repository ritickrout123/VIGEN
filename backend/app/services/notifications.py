import structlog

from app.core.config import get_settings


logger = structlog.get_logger(__name__)


class NotificationService:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def send_job_complete_email(self, email: str, job_id: str, video_url: str | None) -> None:
        logger.info(
            "notification.job_complete",
            email=email,
            job_id=job_id,
            video_url=video_url,
            provider="sendgrid" if self.settings.sendgrid_api_key else "mock",
        )

