# Implementation Plan — VIGEN Phase 1 MVP

> **Architecture note:** LiteLLM is used only for Claude and Gemini. Kling video generation uses a direct `httpx` HTTP client — not LiteLLM. The architecture diagram in design.md will be updated to reflect this.

---

- [x] 1. Create demo/mock provider layer with DEMO_MODE flag
  - Create `backend/app/services/providers/factory.py` that reads `DEMO_MODE` env flag and returns either real or mock providers
  - Create `backend/app/services/providers/mock.py` with `MockAudioAnalysisProvider`, `MockStoryboardProvider`, `MockVideoRenderProvider`, `MockVideoAssemblyProvider` — each with realistic async delays and structured fake data
  - Add `backend/fixtures/sample_clip.mp4` (a short silent MP4 for local testing)
  - Update `docker-compose.yml` to set `DEMO_MODE=true` by default so `docker compose up` produces a working demo with zero real API keys
  - All Celery tasks must complete successfully in demo mode before any real provider is wired
  - _Requirements: 1.1, 1.2, 1.3, 5.1_

- [x] 2. Fix Celery async architecture — job creation must return immediately
  - In `JobService.create_job`, replace any synchronous provider calls with `celery_app.send_task("jobs.analyse_and_plan", args=[job.id])` and return the job record immediately with `status="queued"`
  - Verify the API request thread never calls `AudioAnalysisProvider`, `StoryboardProvider`, or any render logic directly
  - Verify `POST /api/jobs` returns within 200 ms in demo mode
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 2.1 Write property test for job creation returns queued status
  - **Property 1: Job creation returns queued status**
  - **Validates: Requirements 1.1**

- [x] 3. Fix database migration discipline and remove create_all
  - Remove `Base.metadata.create_all` call from `backend/app/main.py` lifespan
  - Add Alembic revision check on startup: call `alembic current` and log a warning if not at head
  - Create Alembic migration for the `credit_transactions` table
  - _Requirements: 17.1, 17.2, 17.3_

- [x] 4. Implement StorageService with real R2 and filesystem backends
  - Implement `write_bytes`, `read_bytes`, and `write_stream` methods in `backend/app/services/storage.py`
  - R2 backend: use `aioboto3` S3-compatible client; raise on write failure so Celery retries
  - Filesystem backend: write to `filesystem_storage_root / path`; return `/media/{path}` URL
  - R2 backend: return `{r2_public_base_url}/{path}` URL
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [ ]* 4.1 Write property test for storage backend routing
  - **Property 16: Storage backend routing**
  - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 5. Implement audio upload endpoint with file validation
  - Add `POST /api/uploads/audio` route in `backend/app/api/routes/`
  - Validate MIME type (MP3/WAV/FLAC) and file size (≤ 200 MB); return 422 on failure
  - Upload validated file to `StorageService` and return the public URL
  - _Requirements: 7.4, 13.2_

- [ ]* 5.1 Write property test for audio upload validation
  - **Property 17: Audio upload validation**
  - **Validates: Requirements 7.4**

- [x] 6. Fix AudioAnalysisProvider — multimodal Gemini call and energy-based fallback
  - Upgrade Gemini call to pass audio file bytes as multimodal content (base64-encoded audio part)
  - Implement deterministic fallback: derive mood from RMS energy, genre from spectral centroid, key from chroma features
  - Ensure returned dict always contains all 8 keys: `bpm`, `beats`, `onsets`, `mood`, `genre`, `key`, `energy_arc`, `scene_count_hint`
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [ ]* 6.1 Write property test for analysis result structure
  - **Property 3: Analysis result structure**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.5**

- [ ] 7. Wire analysis persistence — beat map and job.audio_analysis
  - In `JobService.run_analysis_and_planning`, ensure `AudioBeatMap` row is written with `bpm`, `beat_times`, `bar_times`, `downbeat_times`, `onset_times` from analysis result
  - Ensure `job.audio_analysis` is set to the full 8-key dict before commit
  - _Requirements: 2.4, 2.5_

- [ ]* 7.1 Write property test for analysis persistence round-trip
  - **Property 4: Analysis persistence round-trip**
  - **Validates: Requirements 2.4, 2.5**

- [ ] 8. Fix StoryboardProvider — correct model, retry loop, preset injection, rejection reason
  - Change model string from `anthropic/claude-3-5-sonnet` to `anthropic/claude-sonnet-4-5`
  - Add retry loop: attempt Claude call up to 3 times on JSON parse error or `ValidationError`; fall back to deterministic generator after 3 failures
  - Update `generate` signature to accept `preset: StylePreset | None` and `rejection_reason: str | None`
  - Inject preset's `prompt_modifier`, `motion_bias`, `lighting_bias` into the Claude prompt
  - Inject `rejection_reason` as a revision instruction when present
  - Capture `prompt_template_version` on the job at generation time
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 12.3_

- [ ]* 8.1 Write property test for StoryboardSchema validation invariant
  - **Property 5: StoryboardSchema validation invariant**
  - **Validates: Requirements 3.2**

- [ ]* 8.2 Write property test for Claude prompt construction
  - **Property 7: Claude prompt construction**
  - **Validates: Requirements 3.1, 3.5, 12.3**

- [ ] 9. Wire storyboard persistence and approval gate
  - In `JobService.run_analysis_and_planning`, pass `style_preset` and `storyboard_rejection_reason` to `StoryboardProvider.generate`
  - Verify `job.status` is set to `"awaiting_approval"` and scenes are persisted after generation
  - In `JobService.approve_storyboard`, verify no render task is enqueued before this call
  - _Requirements: 3.4, 4.1, 4.2_

- [ ]* 9.1 Write property test for storyboard generation persistence
  - **Property 6: Storyboard generation persistence**
  - **Validates: Requirements 3.4**

- [ ]* 9.2 Write property test for approval gate
  - **Property 8: Approval gate — no render before approve**
  - **Validates: Requirements 4.1**

- [ ]* 9.3 Write property test for approval state transition
  - **Property 9: Approval state transition**
  - **Validates: Requirements 4.2**

- [ ]* 9.4 Write property test for rejection state mutation
  - **Property 10: Rejection state mutation**
  - **Validates: Requirements 4.3**

- [ ] 10. Implement CreditService
  - Create `backend/app/services/credits.py` with `deduct_credits`, `reconcile_credits`, and `get_balance` methods
  - `deduct_credits`: insert `credit_transactions` row with `type="reserve"`, `amount=-estimated_cost`; raise `InsufficientCreditsError` if balance < estimated cost
  - `reconcile_credits`: insert adjustment row with `type="reconcile"`, `amount=estimated_cost - actual_cost`
  - `get_balance`: return sum of all `credit_transactions.amount` for the user
  - Add `GET /api/credits/balance` endpoint
  - Wire `deduct_credits` into `approve_storyboard` and `reconcile_credits` into job completion
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 10.1 Write property test for credit deduction persistence
  - **Property 20: Credit deduction persistence**
  - **Validates: Requirements 10.1, 10.3**

- [ ]* 10.2 Write property test for insufficient credits rejection
  - **Property 21: Insufficient credits rejection**
  - **Validates: Requirements 10.4**

- [ ]* 10.3 Write property test for credit balance accuracy
  - **Property 22: Credit balance accuracy**
  - **Validates: Requirements 10.5**

- [ ] 11. Implement per-job cost cap enforcement in render pipeline
  - In `JobService.render_job`, after each scene completes, check `actual_cost_usd` against `cost_cap_usd`
  - If cap exceeded: set all remaining `pending` scenes to `status="failed"` with `failure_reason="cost_cap_exceeded"`, set `job.status="failed"`, publish a `ProgressEvent`, then proceed to assemble completed scenes
  - Implement `cost_cap_usd` defaulting in `create_job`
  - _Requirements: 5.6, 11.1, 11.2, 11.3, 11.4_

- [ ]* 11.1 Write property test for cost cap enforcement
  - **Property 13: Cost cap enforcement**
  - **Validates: Requirements 5.6, 11.2, 11.3**

- [ ]* 11.2 Write property test for cost cap default
  - **Property 23: Cost cap default**
  - **Validates: Requirements 11.1**

- [ ] 12. Fix VideoRenderProvider — direct Kling HTTP client with polling
  - Replace LiteLLM `completion` call with direct `httpx` calls to the Kling API (not via LiteLLM)
  - `POST /v1/videos/text2video` with `prompt`, `duration`, `aspect_ratio`
  - Poll `GET /v1/videos/text2video/{task_id}` until `status == "succeed"` or 120 s timeout
  - Extract `video_url`, download clip, upload to `StorageService`, return `RenderResult` with real `cost_usd` and `render_time_seconds`
  - _Requirements: 5.2, 5.3_

- [ ]* 12.1 Write property test for scene render persistence
  - **Property 11: Scene render persistence**
  - **Validates: Requirements 5.2, 5.3**

- [ ] 13. Implement parallel scene rendering with Celery group/chord
  - Add `jobs.render_scene` Celery task in `backend/app/workers/tasks.py`
  - Refactor `JobService.render_job` to dispatch a `group` of `render_scene` sub-tasks instead of a sequential loop
  - Use a `chord` callback to trigger assembly after all scenes complete
  - Handle partial failure: failed scenes do not abort the chord
  - Trigger real partial preview assembly (via `VideoAssemblyProvider`) when `scenes_completed >= preview_scene_threshold`
  - _Requirements: 5.1, 5.4, 5.5_

- [ ]* 13.1 Write property test for preview threshold trigger
  - **Property 12: Preview threshold trigger**
  - **Validates: Requirements 5.5**

- [ ] 14. Fix VideoAssemblyProvider — async FFmpeg, duration validation
  - Replace `subprocess.run` with `asyncio.create_subprocess_exec` for non-blocking FFmpeg execution
  - After assembly, run `ffprobe` to extract output duration and validate within 0.5 s of `expected_duration`
  - On duration mismatch or non-zero FFmpeg exit: set `job.status="failed"` with descriptive `failure_reason`, log full stderr
  - Upload assembled MP4 to `StorageService` and store URL in `job.final_video_url`
  - Implement real partial preview assembly (same concat logic on first N scenes)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ]* 14.1 Write property test for FFmpeg command construction
  - **Property 14: FFmpeg command construction**
  - **Validates: Requirements 6.1, 6.2**

- [ ]* 14.2 Write property test for assembly duration validation
  - **Property 15: Assembly duration validation**
  - **Validates: Requirements 6.3, 6.4**

- [ ] 15. Implement Celery task error handling — set job to failed on exception
  - Wrap `analyse_and_plan` and `render` task bodies in try/except
  - On unhandled exception: set `job.status="failed"`, set `job.failure_reason` to the exception message, commit
  - _Requirements: 1.4_

- [ ]* 15.1 Write property test for task failure sets job to failed
  - **Property 2: Task failure sets job to failed**
  - **Validates: Requirements 1.4**

- [ ] 16. Checkpoint — Run `pytest backend/` — all property tests must pass. Run `docker compose up` and complete the full mock flow from upload to download with zero console errors. Only proceed after both pass.

- [ ] 17. Fix NotificationService — real SendGrid integration
  - Replace log-only stub with `sendgrid.SendGridAPIClient` call when `sendgrid_api_key` is set
  - Wrap SendGrid call in try/except; log at ERROR on failure, never raise
  - When key is absent, log at INFO level and return
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ]* 17.1 Write property test for notification arguments
  - **Property 19: Notification arguments**
  - **Validates: Requirements 9.1, 9.4**

- [ ] 18. Add structured logging to all pipeline stages
  - In each provider method and `JobService` state transition, emit `structlog` entries with `job_id`, `stage`, `provider`, `model`, `latency_ms`, `cost_usd`
  - Log old/new state on every `job.status` change
  - Log task name, job ID, and wall-clock duration at Celery task start/end
  - _Requirements: 16.1, 16.2, 16.3, 16.4_

- [ ]* 18.1 Write property test for log entry structure
  - **Property 25: Log entry structure**
  - **Validates: Requirements 16.1**

- [ ] 19. Implement WebSocket progress events — verify ProgressEvent structure
  - Ensure every `progress_broker.publish` call passes a `ProgressEvent` with all 5 required fields
  - Add terminal event: `stage="done"`, `percent=100` on job completion
  - Add cost-cap event: publish `ProgressEvent` when cap is triggered
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 19.1 Write property test for ProgressEvent structure
  - **Property 18: ProgressEvent structure**
  - **Validates: Requirements 8.2, 8.4**

- [ ] 20. Implement style preset API and wire into job creation
  - Verify `GET /api/presets` endpoint returns all seeded presets
  - Ensure `POST /api/jobs` accepts and stores `style_preset_id`
  - In `JobService.run_analysis_and_planning`, load the preset and pass it to `StoryboardProvider.generate`
  - _Requirements: 12.1, 12.2, 12.4_

- [ ]* 20.1 Write property test for preset injection in job payload
  - **Property 26: Preset injection in job payload**
  - **Validates: Requirements 12.2**

- [ ] 21. Implement scene retry endpoint
  - Verify `POST /api/jobs/{id}/scenes/{n}/retry` resets `scene.status="pending"`, increments `regeneration_count`, and enqueues `jobs.render` for that scene only
  - Set `job.status="rendering"` if job was previously `"complete"` or `"failed"`
  - After retried scene completes, re-run assembly if all other scenes are complete
  - _Requirements: 15.1, 15.2, 15.3_

- [ ]* 21.1 Write property test for scene retry state mutation
  - **Property 24: Scene retry state mutation**
  - **Validates: Requirements 15.1, 15.2**

- [ ] 22. Apply full design system to all frontend pages
  - Implement design tokens (colors, typography, spacing) in `frontend/app/globals.css`
  - Apply dark cinematic design system to all screen states: landing, login, register, dashboard, create, job detail, storyboard review
  - Run in demo mode (`DEMO_MODE=true`) and verify every screen renders correctly with no console errors before proceeding
  - _Requirements: 13.1, 13.3, 14.1_

- [ ] 23. Build frontend create job page (`/create`)
  - Implement `AudioDropzone` component: drag-and-drop, MIME/size validation, upload progress bar calling `POST /api/uploads/audio`
  - Implement `PresetSelector` component: fetch `GET /api/presets` on mount, render preset cards
  - Implement `CreateJobButton`: disabled until upload complete; on click call `POST /api/jobs` with audio URL, file name, duration, preset ID; redirect to `/job/{id}`
  - Display error message on upload failure without losing preset selection
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ]* 23.1 Write property test for create job form submission payload
  - **Property 26: Preset injection in job payload** (frontend side)
  - **Validates: Requirements 12.2, 13.4**

- [ ] 24. Fix frontend import errors and unused React imports
  - Fix `client-shell.jsx`: change `ui.jsxx` import to `ui.jsx`
  - Remove unused `React` imports from all pages where JSX is not used
  - Verify `next build` completes without errors
  - _Requirements: 19.1, 19.2, 19.4_

- [ ] 25. Implement dashboard job list with conditional rendering and DELETE endpoint
  - Verify dashboard fetches jobs ordered by `created_at` descending
  - Render "Review storyboard" link for `status="awaiting_approval"` jobs
  - Render download button linked to `final_video_url` for `status="complete"` jobs
  - Render `failure_reason` text for `status="failed"` jobs
  - Render empty state with CTA when no jobs exist
  - Implement `DELETE /api/jobs/{id}` endpoint and wire a delete button on each job card
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ]* 25.1 Write property test for dashboard job ordering
  - **Property 27: Dashboard job ordering**
  - **Validates: Requirements 14.1**

- [ ]* 25.2 Write property test for dashboard conditional rendering
  - **Property 28: Dashboard conditional rendering**
  - **Validates: Requirements 14.2, 14.3, 14.4**

- [ ] 26. Add CI/CD pipeline
  - Create `.github/workflows/ci.yml` with jobs for: backend lint (`ruff`), backend type check, `python -m compileall`; frontend `node --check` and `next build`
  - Add Docker image build job triggered on pushes to `main`
  - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [ ] 27. Final Checkpoint — Run `pytest backend/` — all property tests must pass. Run `docker compose up` and complete the full mock flow from upload to download with zero console errors. Only proceed after both pass.
