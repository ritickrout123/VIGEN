from datetime import datetime

from pydantic import BaseModel, ConfigDict


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TimestampedResponse(APIModel):
    id: str
    created_at: datetime
    updated_at: datetime
