from pydantic import BaseModel


class ProgressEvent(BaseModel):
    job_id: str
    stage: str
    percent: int
    scenes_complete: int = 0
    scenes_total: int = 0
    eta_seconds: int | None = None
    message: str | None = None

