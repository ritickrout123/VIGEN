from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.style_preset import StylePreset


router = APIRouter()


class StylePresetResponse(BaseModel):
    id: str
    name: str
    description: str | None
    prompt_modifier: str
    color_palette: list[str]
    motion_bias: str | None
    lighting_bias: str | None
    sample_video_url: str | None


@router.get("", response_model=list[StylePresetResponse])
async def list_presets(session: AsyncSession = Depends(get_db)) -> list[StylePresetResponse]:
    presets = await session.scalars(select(StylePreset).where(StylePreset.is_active.is_(True)))
    return [StylePresetResponse.model_validate(preset, from_attributes=True) for preset in presets]

