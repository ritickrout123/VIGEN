"""
Provider factory.

Reads the DEMO_MODE environment flag (or settings.demo_mode) and returns
either the real provider instances or the mock ones.

Usage:
    from app.services.providers.factory import make_providers

    analysis, storyboard, render, assembly = make_providers(storage_service)
"""

import logging

from app.core.config import get_settings
from app.services.storage import StorageService

logger = logging.getLogger(__name__)


def make_providers(storage_service: StorageService):
    """
    Return (AudioAnalysisProvider, StoryboardProvider, VideoRenderProvider, VideoAssemblyProvider).

    When DEMO_MODE=true (or settings.demo_mode is True) the mock implementations
    are returned so the full pipeline works with zero real API keys.
    """
    settings = get_settings()

    if settings.demo_mode:
        logger.info("DEMO_MODE=true — using mock providers")
        from app.services.providers.mock import (
            MockAudioAnalysisProvider,
            MockStoryboardProvider,
            MockVideoAssemblyProvider,
            MockVideoRenderProvider,
        )

        return (
            MockAudioAnalysisProvider(),
            MockStoryboardProvider(),
            MockVideoRenderProvider(storage_service),
            MockVideoAssemblyProvider(storage_service),
        )

    logger.info("DEMO_MODE=false — using real providers")
    from app.services.providers.real import (
        AudioAnalysisProvider,
        StoryboardProvider,
        VideoAssemblyProvider,
        VideoRenderProvider,
    )

    return (
        AudioAnalysisProvider(),
        StoryboardProvider(),
        VideoRenderProvider(storage_service),
        VideoAssemblyProvider(storage_service),
    )
