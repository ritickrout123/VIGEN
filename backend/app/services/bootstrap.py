from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.style_preset import StylePreset


DEFAULT_STYLE_PRESETS = [
    {
        "name": "Cinematic Pulse",
        "description": "High contrast performance look with confident camera motion.",
        "prompt_modifier": "cinematic lighting, anamorphic lens flare, moody contrast, premium music video",
        "color_palette": ["#0F172A", "#F97316", "#F8FAFC"],
        "motion_bias": "dolly",
        "lighting_bias": "cinematic",
    },
    {
        "name": "Neon Drift",
        "description": "Night city energy with electric colors and motion blur.",
        "prompt_modifier": "neon lights, cyber city, chromatic glow, long-lens movement",
        "color_palette": ["#1E1B4B", "#06B6D4", "#F43F5E"],
        "motion_bias": "pan",
        "lighting_bias": "neon",
    },
    {
        "name": "Dream Grain",
        "description": "Soft-focus nostalgic film look with emotive pacing.",
        "prompt_modifier": "dreamlike film grain, poetic textures, soft highlights, romantic atmosphere",
        "color_palette": ["#FDE68A", "#F9A8D4", "#E5E7EB"],
        "motion_bias": "tilt",
        "lighting_bias": "soft",
    },
]


async def seed_style_presets(session: AsyncSession) -> None:
    existing = await session.scalar(select(StylePreset.id).limit(1))
    if existing:
        return
    for preset in DEFAULT_STYLE_PRESETS:
        session.add(StylePreset(**preset))
    await session.commit()
