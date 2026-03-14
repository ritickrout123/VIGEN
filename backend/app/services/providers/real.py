import base64
import io
import json
import logging
import subprocess
import tempfile
from dataclasses import dataclass
from math import ceil
from pathlib import Path

import httpx
import librosa
import numpy as np
from litellm import completion

from app.core.config import get_settings

from app.schemas.storyboard import (
    CameraAngle,
    LightingStyle,
    Mood,
    MotionType,
    StoryboardSchema,
)


@dataclass
class RenderResult:
    video_url: str
    model_name: str
    cost_usd: float
    render_time_seconds: float


class AudioAnalysisProvider:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.logger = logging.getLogger(__name__)

    async def analyze(self, audio_url: str, duration_seconds: float) -> dict:
        self.logger.info(f"Starting real analysis for audio: {audio_url}")

        # 1. Load Audio
        y, sr = await self._load_audio(audio_url)

        # 2. Extract Rhythm (Librosa)
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr).tolist()
        # Round beat times for cleaner storage
        beat_times = [float(round(float(t), 3)) for t in beat_times]

        # 3. Detect Energy Arc (RMS)
        hop_length = 512
        rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
        times_rms = librosa.frames_to_time(range(len(rms)), sr=sr, hop_length=hop_length)
        
        # Sample energy at 3 points (intro, mid, resolve) or more granularly
        energy_arc = [
            {"time": 0.0, "label": "intro", "energy": float(round(float(rms[0]), 3))},
            {"time": float(round(float(times_rms[len(times_rms)//2]), 2)), "label": "lift", "energy": float(round(float(rms[len(rms)//2]), 3))},
            {"time": float(round(float(times_rms[-1]), 2)), "label": "resolve", "energy": float(round(float(rms[-1]), 3))},
        ]

        # 4. Detect Onsets
        onset_frames = librosa.onset.onset_detect(y=y, sr=sr, wait=sr // 2, pre_max=sr // 4, post_max=sr // 4)
        onset_times = librosa.frames_to_time(onset_frames, sr=sr).tolist()

        # 5. Multimodal Intel (Gemini 2.0 Flash) — pass raw audio signal as fallback context
        intel = await self._get_gemini_intel(audio_url, y, sr)

        scene_count = max(1, min(30, ceil(duration_seconds / 5)))

        return {
            "bpm": float(round(float(tempo[0] if hasattr(tempo, "__len__") else tempo), 1)),
            "beats": beat_times,
            "onsets": [float(round(float(t), 3)) for t in onset_times],
            "mood": intel.get("mood") or "energetic",
            "genre": intel.get("genre") or "electronic",
            "energy_arc": energy_arc,
            "key": intel.get("key") or "C Major",
            "scene_count_hint": int(scene_count),
        }

    async def _load_audio(self, url: str):
        # Handle local vs remote URLs
        if url.startswith("/media/"):
            # Local filesystem storage
            relative_path = url.replace("/media/", "")
            full_path = self.settings.filesystem_storage_root / relative_path
            return librosa.load(full_path, sr=22050)
        else:
            # Remote URL (R2 or external)
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                response.raise_for_status()
                # Librosa load requires a path or file-like object
                # For safety with some codecs, we write to a temp file
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                    tmp.write(response.content)
                    tmp_name = tmp.name
                
                try:
                    return librosa.load(tmp_name, sr=22050)
                finally:
                    # Clean up temp file
                    Path(tmp_name).unlink(missing_ok=True)

    async def _load_audio_bytes(self, url: str) -> bytes:
        """Download raw audio bytes for multimodal Gemini call."""
        if url.startswith("/media/"):
            relative_path = url.replace("/media/", "")
            full_path = self.settings.filesystem_storage_root / relative_path
            return full_path.read_bytes()
        else:
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.content

    async def _get_gemini_intel(self, audio_url: str, y: np.ndarray, sr: int) -> dict:
        """
        Call Gemini 2.0 Flash with the audio file as multimodal content (base64-encoded).
        Falls back to deterministic librosa-based analysis on any failure.
        """
        self.logger.info(f"Calling Gemini 2.0 Flash (multimodal) for audio intelligence: {audio_url}")

        prompt = (
            "Analyze this audio file and return ONLY a JSON object with these keys: "
            "mood (e.g. energetic, melancholic, ethereal, aggressive), "
            "genre (e.g. synthwave, industrial, lo-fi, orchestral), "
            "key (e.g. C Major, G# Minor), "
            "summary (one sentence describing the atmosphere)."
        )

        try:
            audio_bytes = await self._load_audio_bytes(audio_url)
            # Detect format from URL extension; default to mp3
            ext = audio_url.rsplit(".", 1)[-1].lower() if "." in audio_url else "mp3"
            mime_map = {"mp3": "audio/mpeg", "wav": "audio/wav", "flac": "audio/flac"}
            mime_type = mime_map.get(ext, "audio/mpeg")

            b64_audio = base64.b64encode(audio_bytes).decode("utf-8")

            response = completion(
                model="gemini/gemini-2.0-flash",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{b64_audio}"
                                },
                            },
                        ],
                    }
                ],
                api_key=self.settings.google_api_key,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            result = json.loads(content)
            # Ensure all expected keys are present
            for key in ("mood", "genre", "key", "summary"):
                if key not in result or not result[key]:
                    raise ValueError(f"Gemini response missing key: {key}")
            return result

        except Exception as exc:
            self.logger.warning(
                f"Gemini multimodal analysis failed: {exc}. Using librosa-based fallback."
            )
            return self._librosa_fallback_intel(y, sr)

    def _librosa_fallback_intel(self, y: np.ndarray, sr: int) -> dict:
        """
        Deterministic fallback that derives mood, genre, and key from librosa features.

        - mood:  derived from mean RMS energy
        - genre: derived from mean spectral centroid
        - key:   derived from dominant chroma bin
        """
        # --- Mood from RMS energy ---
        rms_mean = float(np.mean(librosa.feature.rms(y=y)))
        if rms_mean > 0.1:
            mood = "energetic"
        elif rms_mean > 0.05:
            mood = "dramatic"
        elif rms_mean > 0.02:
            mood = "melancholic"
        else:
            mood = "ambient"

        # --- Genre from spectral centroid ---
        centroid_mean = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
        if centroid_mean > 4000:
            genre = "electronic"
        elif centroid_mean > 2500:
            genre = "synthwave"
        elif centroid_mean > 1500:
            genre = "cinematic"
        else:
            genre = "ambient"

        # --- Key from dominant chroma bin ---
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        chroma_mean = np.mean(chroma, axis=1)
        dominant_bin = int(np.argmax(chroma_mean))
        note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
        note = note_names[dominant_bin % 12]
        # Use minor if energy is low, major otherwise
        mode = "Minor" if rms_mean < 0.05 else "Major"
        key = f"{note} {mode}"

        return {
            "mood": mood,
            "genre": genre,
            "key": key,
            "summary": f"Deterministic fallback: {mood} {genre} track in {key}.",
        }


class StoryboardProvider:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.logger = logging.getLogger(__name__)

    async def generate(self, analysis: dict, duration_seconds: float) -> StoryboardSchema:
        self.logger.info("Generating AI Storyboard with Claude 3.5 Sonnet")
        
        bpm = analysis.get("bpm", 120)
        mood = analysis.get("mood", "energetic")
        genre = analysis.get("genre", "electronic")
        energy_arc = analysis.get("energy_arc", [])
        
        # Determine scene count based on energy and duration
        # High energy = more frequent cuts
        energy_values = [float(e["energy"]) for e in energy_arc]
        avg_energy = sum(energy_values) / len(energy_values) if energy_values else 0.5
        scenes_per_minute = 12 if avg_energy > 0.7 else 8
        target_scene_count = max(4, min(30, int((float(duration_seconds) / 60.0) * float(scenes_per_minute))))
        
        prompt = f"""
        You are a world-class Cinematic Director and AI Video Architect.
        Create a detailed visual storyboard for a music video based on this audio analysis:
        
        - Duration: {duration_seconds} seconds
        - BPM: {bpm}
        - Mood: {mood}
        - Genre: {genre}
        - Energy Highlights: {energy_arc}
        
        Requirements:
        1. Breakdown into exactly {target_scene_count} contiguous scenes.
        2. Total duration of all scenes must EQUAL {duration_seconds} seconds exactly.
        3. Visual descriptions must be cinematic, highly detailed, and emotionally resonant.
        4. Coordinate camera angles and lighting to match the 'Energy Highlights'.
        5. Maintain a consistent narrative arc throughout the scenes.
        
        Output MUST be a valid JSON object matching this schema structure:
        {{
            "scenes": [
                {{
                    "scene_index": 0,
                    "start_time_seconds": 0.0,
                    "end_time_seconds": 5.2,
                    "duration_seconds": 5.2,
                    "visual_description": "...",
                    "motion_type": "zoom|pan|static|dolly|rotate|tilt",
                    "lighting_style": "cinematic|neon|natural|dramatic|soft|harsh",
                    "color_palette": ["#HEX1", "#HEX2", ...],
                    "mood": "energetic|calm|dramatic|playful|melancholic|aggressive|romantic|mysterious",
                    "camera_angle": "wide|medium|close_up|extreme_close_up|overhead|low_angle",
                    "beat_importance_score": 0.0-1.0,
                    "bar_start_beat_index": 0,
                    "bar_end_beat_index": 4,
                    "transition_type": "cut"
                }},
                ...
            ],
            "total_duration_seconds": {duration_seconds},
            "narrative_arc": "Summary of the story arc...",
            "dominant_mood": "{mood}",
            "quality_score": 0.0-10.0
        }}
        
        Return ONLY the JSON. No preamble.
        """
        
        try:
            response = completion(
                model="anthropic/claude-3-5-sonnet",
                messages=[{"role": "user", "content": prompt}],
                api_key=self.settings.anthropic_api_key,
                response_format={"type": "json_object"}
            )
            
            import json
            content = response.choices[0].message.content
            # Clean up potential markdown formatting
            if content.startswith("```json"):
                content = content.replace("```json", "").replace("```", "").strip()
            
            data = json.loads(content)
            
            # Basic validation/fix-up for contiguous scenes if LLM drifted slightly
            current_time = 0.0
            for i, scene in enumerate(data["scenes"]):
                scene["scene_index"] = i
                scene["start_time_seconds"] = float(round(current_time, 2))
                # Ensure duration is present
                dur = float(scene.get("duration_seconds", duration_seconds / target_scene_count))
                scene["end_time_seconds"] = float(round(current_time + dur, 2))
                scene["duration_seconds"] = float(round(dur, 2))
                current_time += dur
            
            # Final scene adjustment to match total_duration_seconds exactly
            last_scene = data["scenes"][-1]
            if abs(float(last_scene["end_time_seconds"]) - float(duration_seconds)) > 0.01:
                last_scene["end_time_seconds"] = float(duration_seconds)
                last_scene["duration_seconds"] = float(round(float(last_scene["end_time_seconds"]) - float(last_scene["start_time_seconds"]), 2))
            
            data["total_duration_seconds"] = float(duration_seconds)
            
            return StoryboardSchema(**data)
            
        except Exception as exc:
            self.logger.error(f"Claude storyboard generation failed: {exc}. Using fallback generator.")
            return await self._fallback_generate(analysis, duration_seconds)

    async def _fallback_generate(self, analysis: dict, duration_seconds: float) -> StoryboardSchema:
        # Re-using the logic from the previous mock implementation as a safe fallback
        scene_count = max(1, min(30, int(analysis.get("scene_count_hint", ceil(float(duration_seconds) / 5.0)))))
        scene_duration = float(round(float(duration_seconds) / float(scene_count), 2))
        scenes = []
        for index in range(scene_count):
            start = float(round(float(index) * float(scene_duration), 2))
            end_calc = float(duration_seconds) if index == scene_count - 1 else float((index + 1) * scene_duration)
            end = float(round(end_calc, 2))
            duration = float(round(end - start, 2))
            scenes.append(
                {
                    "scene_index": index,
                    "start_time_seconds": float(start),
                    "end_time_seconds": float(end),
                    "duration_seconds": float(duration),
                    "visual_description": (
                        f"Cinematic music video scene {index + 1} with neon atmosphere, "
                        "dynamic camera motion, and emotionally synchronized imagery."
                    ),
                    "motion_type": MotionType.DOLLY,
                    "lighting_style": LightingStyle.CINEMATIC,
                    "color_palette": ["#0F172A", "#F97316", "#F8FAFC"],
                    "mood": Mood.ENERGETIC,
                    "camera_angle": CameraAngle.WIDE,
                    "beat_importance_score": 0.7,
                    "bar_start_beat_index": index * 4,
                    "bar_end_beat_index": (index + 1) * 4,
                    "transition_type": "cut",
                }
            )
        return StoryboardSchema(
            scenes=scenes,
            total_duration_seconds=float(duration_seconds),
            dominant_mood=Mood.ENERGETIC,
            narrative_arc="Fallback narrative generated due to provider error.",
            quality_score=5.0,
        )


class VideoRenderProvider:
    def __init__(self, storage_service) -> None:
        self.settings = get_settings()
        self.storage_service = storage_service
        self.logger = logging.getLogger(__name__)

    async def render_scene(self, job_id: str, scene_index: int, prompt: str) -> RenderResult:
        prompt_str = str(prompt)
        self.logger.info(f"Rendering scene {scene_index} with Kling-v1.5: {prompt_str[:50]}...")
        
        # In a real setup, Kling v1.5 might require specific parameters for motion and aspect ratio
        try:
            # Note: Kling-v1.5 is supported via LiteLLM/direct providers
            response = completion(
                model="kling/kling-v1.5",
                messages=[{"role": "user", "content": prompt}],
                api_key=self.settings.kling_api_key,
                # Additional params like duration=5s, quality=high, etc.
            )
            
            video_url_orig = response.choices[0].message.content # LiteLLM might return the URL here
            
            # Download the rendered video and save to our storage (R2/Filesystem)
            async with httpx.AsyncClient() as client:
                res = await client.get(video_url_orig)
                res.raise_for_status()
                path = f"renders/{job_id}/scene-{scene_index:03d}.mp4"
                video_url = await self.storage_service.write_bytes(path, res.content)
            
            return RenderResult(
                video_url=video_url,
                model_name="kling-v1.5",
                cost_usd=0.85, # Estimated cost for Kling 5s render
                render_time_seconds=45.0, # Average production time
            )
            
        except Exception as exc:
            self.logger.warning(f"Kling render failed: {exc}. Using mock fallback.")
            return await self._mock_render(job_id, scene_index, prompt)

    async def _mock_render(self, job_id: str, scene_index: int, prompt: str) -> RenderResult:
        fake_video_bytes = (
            f"VIGEN mock render\njob={job_id}\nscene={scene_index}\nprompt={prompt}\n".encode("utf-8")
        )
        video_url = await self.storage_service.write_bytes(
            f"renders/{job_id}/scene-{scene_index:03d}.mp4",
            fake_video_bytes,
        )
        return RenderResult(
            video_url=video_url,
            model_name="mock-kling",
            cost_usd=0.15,
            render_time_seconds=2.5,
        )


class VideoAssemblyProvider:
    def __init__(self, storage_service) -> None:
        self.settings = get_settings()
        self.storage_service = storage_service
        self.logger = logging.getLogger(__name__)

    async def assemble(self, job_id: str, scene_urls: list[str], audio_url: str) -> str:
        self.logger.info(f"Assembling final video for job {job_id}")
        
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            
            # 1. Download all scenes
            scene_files = []
            async with httpx.AsyncClient() as client:
                for i, url in enumerate(scene_urls):
                    res = await client.get(url)
                    scene_file = tmp_path / f"scene_{i:03d}.mp4"
                    scene_file.write_bytes(res.content)
                    scene_files.append(scene_file)
                
                # 2. Download audio
                audio_res = await client.get(audio_url)
                audio_file = tmp_path / "audio.mp3"
                audio_file.write_bytes(audio_res.content)
            
            # 3. Create concat list for FFmpeg
            concat_list = tmp_path / "concat.txt"
            with open(concat_list, "w") as f:
                for sf in scene_files:
                    f.write(f"file '{sf.name}'\n")
            
            # 4. Use FFmpeg to concat and mix audio
            output_file = tmp_path / "final.mp4"
            # Concat without re-encoding if possible, otherwise map audio
            cmd = [
                "ffmpeg", "-y",
                "-f", "concat", "-safe", "0", "-i", str(concat_list),
                "-i", str(audio_file),
                "-c:v", "copy", "-c:a", "aac", "-shortest",
                str(output_file)
            ]
            
            try:
                process = subprocess.run(cmd, capture_output=True, text=True)
                if process.returncode != 0:
                    raise Exception(f"FFmpeg error: {process.stderr}")
                
                # 5. Upload final video
                final_bytes = output_file.read_bytes()
                final_url = await self.storage_service.write_bytes(f"renders/{job_id}/final.mp4", final_bytes)
                return final_url
                
            except Exception as e:
                self.logger.error(f"Assembly failed: {e}")
                # Fallback URL or error
                return await self.storage_service.write_bytes(f"renders/{job_id}/final.mp4", b"Placeholder final video")

