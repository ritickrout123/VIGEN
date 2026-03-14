# VIGEN — Project Review Report
**Date:** March 14, 2026 | **Phase Reviewed:** Phase 1 MVP

---

## 1. Project Overview

VIGEN is a music-driven AI video generation SaaS. Users upload a music track (MP3/WAV/FLAC) and receive a cinematic, beat-synchronized music video. The core pipeline is:

> **Audio Upload → Analysis → Storyboard Generation → Storyboard Approval Gate → Parallel Scene Rendering → FFmpeg Assembly → Download/Share**

The target is a 5-phase product roadmap. **Phase 1** (the current scope) is a production-safe MVP to be delivered over 8 weeks across 4 x 2-week sprints.

**Key documents reviewed:**
- [Project_Status/COMPLETED.md](file:///home/wco10/Downloads/vvmg/Project_Status/COMPLETED.md) — self-reported implementation status
- [Project_Status/PLAN.md](file:///home/wco10/Downloads/vvmg/Project_Status/PLAN.md) — 906-line delivery roadmap + sprint plan
- [docs/VIGEN_PRD_STRATEGIC_v2.md](file:///home/wco10/Downloads/vvmg/Project_Status/docs/VIGEN_PRD_STRATEGIC_v2.md) — strategic product requirements
- [docs/VIGEN_TECHNICAL_SPEC_PHASE1.md](file:///home/wco10/Downloads/vvmg/Project_Status/docs/VIGEN_TECHNICAL_SPEC_PHASE1.md) — detailed technical specification
- [docs/UI_Design_&_Development_Plan.txt](file:///home/wco10/Downloads/vvmg/Project_Status/docs/UI_Design_&_Development_Plan.txt) — frontend design + component plan
- [docs/architecture.txt](file:///home/wco10/Downloads/vvmg/Project_Status/docs/architecture.txt) — early architecture rationale
- Direct inspection of `backend/` and `frontend/` source code

---

## 2. List of Requirements

### Phase 1 Core Requirements (from PLAN.md §4 + PRD §2)

| # | Requirement | Priority |
|---|---|---|
| R1 | Email/password auth with JWT access + refresh token flow | P0 |
| R2 | Audio upload (MP3/WAV/FLAC, up to 200 MB) to object storage | P0 |
| R3 | Job creation and persisted job state machine (10 states) | P0 |
| R4 | Audio analysis worker: librosa BPM/beat extraction + Gemini mood analysis | P0 |
| R5 | Storyboard JSON generation via Claude Sonnet 4.5 + Haiku 3.5 enrichment | P0 |
| R6 | Storyboard approval gate — no rendering before user approval | P0 |
| R7 | Storyboard reject + regenerate flow (with reason) | P0 |
| R8 | Parallel scene rendering via Celery fan-out through provider abstraction (Kling 1.6) | P0 |
| R9 | Real-time job progress via WebSocket/Socket.IO | P0 |
| R10 | Partial video preview after first ~5 scenes complete | P0 |
| R11 | Final FFmpeg assembly with `-c copy` + original audio mapping | P0 |
| R12 | Download & shareable link for completed video | P0 |
| R13 | Per-scene retry endpoint | P1 |
| R14 | Job completion email notification via SendGrid | P1 |
| R15 | Style preset gallery (6–8 curated styles) | P1 |
| R16 | Pre-render cost estimate display | P1 |
| R17 | Credit/token ledger foundation (no checkout UI) | P1 |
| R18 | Job history dashboard | P1 |
| R19 | Prompt template versioning (`prompt_template_version` on Job schema) | P0 tech |
| R20 | Per-job hard cost cap enforcement in worker | P0 tech |
| R21 | Structured logging with correlation IDs | P0 tech |
| R22 | Docker Compose local stack | P0 infra |
| R23 | Alembic DB migrations (full schema for all tables) | P0 infra |
| R24 | CI/CD pipeline skeleton | P0 infra |
| R25 | Beat map stored separately (BPM, beat_times, bar_times, onset_times) | P0 tech |

### Explicitly Excluded from Phase 1 (per PLAN.md §4)
Social login, public API, webhooks, Wan/RunPod GPU, multi-format export, full billing checkout, collaborative editing, prompt editing before render, character consistency, stem splitting, Prometheus/Grafana.

---

## 3. Completed Features

Per [COMPLETED.md](file:///home/wco10/Downloads/vvmg/Project_Status/COMPLETED.md) and verified by code inspection:

### ✅ Verified as Actually Built

| Feature | Evidence |
|---|---|
| FastAPI app scaffold + CORS + lifespan | [backend/app/main.py](file:///home/wco10/Downloads/vvmg/backend/app/main.py) |
| Auth endpoints (register, login, refresh, me) | [backend/app/api/routes/auth.py](file:///home/wco10/Downloads/vvmg/backend/app/api/routes/auth.py) |
| `POST/GET /api/jobs`, `GET /api/jobs/{id}` | [backend/app/api/routes/jobs.py](file:///home/wco10/Downloads/vvmg/backend/app/api/routes/jobs.py) |
| `POST /api/jobs/{id}/approve` | `backend/app/api/routes/jobs.py:97` |
| `POST /api/jobs/{id}/reject` | `backend/app/api/routes/jobs.py:114` |
| `POST /api/jobs/{id}/scenes/{n}/retry` | `backend/app/api/routes/jobs.py:128` |
| `GET /api/jobs/{id}/scenes` | `backend/app/api/routes/jobs.py:87` |
| WebSocket progress endpoint (`/{job_id}/ws`) | `backend/app/api/routes/jobs.py:149` |
| Job state machine (10 states, transitions) | [backend/app/services/jobs.py](file:///home/wco10/Downloads/vvmg/backend/app/services/jobs.py) |
| Beat map persistence (separate `AudioBeatMap` table) | `backend/app/services/jobs.py:86` |
| Provider abstraction classes | [backend/app/services/providers.py](file:///home/wco10/Downloads/vvmg/backend/app/services/providers.py) |
| Style presets table + seeding | [backend/app/services/bootstrap.py](file:///home/wco10/Downloads/vvmg/backend/app/services/bootstrap.py) (referenced in [main.py](file:///home/wco10/Downloads/vvmg/backend/app/main.py)) |
| Celery task scaffold ([analyse_and_plan](file:///home/wco10/Downloads/vvmg/backend/app/workers/tasks.py#15-18), [render](file:///home/wco10/Downloads/vvmg/backend/app/workers/tasks.py#20-23)) | [backend/app/workers/tasks.py](file:///home/wco10/Downloads/vvmg/backend/app/workers/tasks.py) |
| Progress broker (WebSocket pub/sub) | [backend/app/services/progress.py](file:///home/wco10/Downloads/vvmg/backend/app/services/progress.py) (referenced) |
| Partial preview threshold logic | `backend/app/services/jobs.py:226` |
| Email notification call on completion | `backend/app/services/jobs.py:254` |
| Estimated cost computation and per-job cap config | `backend/app/services/jobs.py:106` |
| Initial Alembic migration file | `backend/alembic/versions/` |
| Next.js App Router shell | `frontend/app/` (page.js, layout.js) |
| Login / Register pages | `frontend/app/login/`, `frontend/app/register/` |
| Dashboard page | `frontend/app/dashboard/` |
| Create-job page | `frontend/app/create/` |
| Job detail + review sub-pages | `frontend/app/job/[id]/` |
| `frontend/lib/api.js` and `frontend/lib/auth.js` | `frontend/lib/` |
| Docker Compose + `.env.example` | Repo root |
| `pyproject.toml` project config | `backend/pyproject.toml` |
| Python syntax validation passed | Per `COMPLETED.md` |
| Node syntax validation passed | Per `COMPLETED.md` |

---

## 4. Requirement vs. Implementation Mapping

| Req | Description | Status | Notes |
|---|---|---|---|
| R1 | JWT auth with access + refresh | ✅ Scaffold | Auth routes exist; token refresh confirmed in `auth.py` |
| R2 | Audio upload to object storage | ⚠️ Partial | `uploads.py` route exists; uses local filesystem (`StorageService`) instead of real R2/S3 |
| R3 | Job state machine (10 states) | ✅ Done | Full `JobStatus` enum and transitions in `jobs.py` |
| R4 | Audio analysis (librosa + Gemini) | ❌ Mock only | `AudioAnalysisProvider.analyze()` returns hardcoded values — no librosa, no Gemini call |
| R5 | Storyboard via Claude Sonnet/Haiku | ❌ Mock only | `StoryboardProvider.generate()` returns templated fake scenes — no LiteLLM, no Claude |
| R6 | Storyboard approval gate | ✅ Done | `approve_storyboard()` enforces `awaiting_approval` state check before render |
| R7 | Storyboard reject + regenerate | ✅ Done | `reject_storyboard()` re-triggers `run_analysis_and_planning()` |
| R8 | Parallel scene rendering via Celery / Kling | ❌ Mock only | `render_job()` loops scenes sequentially in-process; `VideoRenderProvider` writes placeholder bytes labeled `"mock-kling"`, no real Celery fan-out |
| R9 | Real-time WebSocket progress | ✅ Done | WebSocket endpoint + `progress_broker.publish()` wired throughout pipeline |
| R10 | Partial preview after 5 scenes | ⚠️ Partial | Logic exists at `jobs.py:226` but writes a placeholder byte string, not a real assembled clip |
| R11 | FFmpeg assembly with audio mapping | ❌ Missing | `render_job()` writes `b"VIGEN final video placeholder"` — no FFmpeg call anywhere in codebase |
| R12 | Download + shareable link | ⚠️ Partial | `final_video_url` field stored, but URL points to a local-filesystem placeholder file |
| R13 | Per-scene retry | ✅ Done | `retry_scene()` + `POST /scenes/{n}/retry` route functional |
| R14 | SendGrid completion email | ⚠️ Partial | `NotificationService.send_job_complete_email()` is called; actual SendGrid integration unverified (stub likely) |
| R15 | Style preset gallery | ⚠️ Partial | `style_presets` table + seeder exist; no preset selection UI wired in frontend |
| R16 | Pre-render cost estimate | ⚠️ Partial | `estimated_cost_usd` computed (fixed formula `scenes * 0.15 + 0.12`), not based on real provider pricing |
| R17 | Credit ledger foundation | ⚠️ Partial | `credit_transactions` table in schema (Tech Spec); `CreditService` not found in codebase — not implemented |
| R18 | Job history dashboard | ⚠️ Partial | Frontend `dashboard` page exists; relies on mock fallback mode |
| R19 | Prompt template versioning | ✅ Done | `prompt_template_version` column on Job model, defaulting to `"1.0"` |
| R20 | Per-job hard cost cap enforcement | ❌ Missing | `cost_cap_usd` column exists and is passed through, but no enforcement logic kills a job mid-run if cap is exceeded |
| R21 | Structured logging with correlation IDs | ⚠️ Partial | `configure_logging()` called in lifespan; no evidence of `job_id`/`scene_id` correlation fields in log output |
| R22 | Docker Compose local stack | ✅ Done | `docker-compose.yml` at repo root |
| R23 | Alembic migrations (full schema) | ⚠️ Partial | One migration file exists; `main.py` calls `create_all` directly which bypasses migration workflow |
| R24 | CI/CD pipeline | ❌ Missing | No `.github/workflows/` or equivalent pipeline config found in codebase |
| R25 | Beat map stored separately | ✅ Done | `AudioBeatMap` model + per-job storage in `run_analysis_and_planning()` |

---

## 5. Gaps / Missing Features

### 🔴 Critical Gaps (blocks production viability)

1. **No real audio analysis** — `AudioAnalysisProvider` is 100% hardcoded mock. `librosa` is not called. Gemini Audio API is not integrated. BPM is always `120.0`, mood is always `"energetic"`. (Fails R4)

2. **No real storyboard generation** — `StoryboardProvider` generates templated fake text scenes with no LLM call. LiteLLM is not integrated. Claude Sonnet 4.5 / Haiku 3.5 are not called. (Fails R5)

3. **No real video rendering** — `VideoRenderProvider` writes a text string as an `.mp4` file. Kling 1.6 API is never called. Celery fan-out does not parallelize scenes — they render sequentially inside the API request. (Fails R8)

4. **No FFmpeg assembly** — The final video is a placeholder byte string. No scene clips are concatenated, no audio is mapped. The core product output does not exist. (Fails R11)

5. **No hard cost cap enforcement** — The `cost_cap_usd` field is stored but never checked mid-render. The spec requires the job to be killed if the cap is exceeded during Celery execution. (Fails R20)

6. **No CI/CD pipeline** — No pipeline config file (GitHub Actions, GitLab CI, etc.) found. Sprint 1 required a CI skeleton. (Fails R24)

### 🟠 Significant Gaps (reduces MVP quality)

7. **Credit service not implemented** — The `CreditService` from the Technical Spec (atomic `deduct_credits`, `add_credits`) is not present in the codebase. The credit ledger table may exist in schema but there is no service logic and no API surface. (Partially fails R17)

8. **Object storage not integrated** — `StorageService` writes files to the local filesystem, not Cloudflare R2 or any S3-compatible store. The `.env.example` references R2 credentials but they are unused in code. (Fails R2 fully for production)

9. **Partial preview is a placeholder** — The preview assembly after 5 scenes writes `b"VIGEN preview placeholder"` — no actual FFmpeg partial concat. (Partially fails R10)

10. **Celery workers not truly async/background** — `create_job()` in `jobs.py:50` calls `run_analysis_and_planning()` directly and awaits it in the API request thread. Analysis and planning block the HTTP response, contradicting the async pipeline design.

11. **SendGrid not confirmed wired** — `NotificationService` is called but its implementation has not been verified. Likely a stub.

### 🟡 Minor Gaps / Deferrable Items

12. **No frontend mock service layer (MSW)** — The UI design doc specified MSW with `NEXT_PUBLIC_USE_MOCKS=true`. The frontend uses a "mock fallback mode" but proper MSW setup is not confirmed.

13. **Cost estimate formula is naive** — `estimated_cost_usd = scenes * 0.15 + 0.12`. The PRD specifies a breakdown by Claude + Gemini + Kling costs, not a flat per-scene rate.

14. **No style preset UI wired** — The style preset seeder exists but is not connected to the Create Job frontend page.

15. **Alembic migration discipline** — `main.py` runs `Base.metadata.create_all` at startup, which bypasses Alembic and will cause schema drift in production. Migrations should be the only schema evolution mechanism.

16. **No delete job endpoint** — PRD §5 lists `DELETE /api/jobs/{id}` as a Phase 1 API contract; it is not implemented.

---

## 6. Misalignments / Issues

| Issue | Spec Says | Implementation Does |
|---|---|---|
| Rendering concurrency | Celery fan-out (parallel scenes) | Sequential `for` loop in API request thread |
| Analysis provider | librosa + Gemini 2.0 Flash in `asyncio.gather` | Returns hardcoded dict in ~0ms |
| Storyboard provider | Claude Sonnet 4.5 → Pydantic validation | Returns pre-built template dict |
| Storage | Cloudflare R2 / pre-signed URLs | Local filesystem (`StorageService.write_bytes`) |
| Cost cap | Kill job mid-render if cap exceeded | Field stored, never checked |
| Beat map derivation | `bar_times = actual bar boundaries from librosa` | `beats[::4]` (every 4th of a hardcoded 0.5s beat array) |
| FFmpeg assembly | `-c copy` concat + `-map 1:a` original audio | Not present — no FFmpeg subprocess called anywhere |
| Partial preview | Real FFmpeg partial concat at 5-scene threshold | `b"VIGEN preview placeholder"` bytes written to disk |
| Scene sync | Final video duration validated vs audio ±0.5s | No validation; duration just copies `audio_duration_seconds` |
| Job status `pending` | First state before queuing | Skipped — job is immediately set to `"queued"` then `"analysing"` synchronously in-request |
| PLAN.md §5 assumed | Celery worker runs as separate process | Celery task definitions exist but analysis runs synchronously in-request, Celery not invoked |

---

## 7. Recommendations to Fix / Complete the Project

### 🔴 Priority 1 — Without these, nothing ships

**1. Wire real audio analysis (Sprint 2)**
- Install `librosa` in the worker image; implement actual BPM, beat extraction, onset detection.
- Integrate Gemini 2.0 Flash via API for mood analysis.
- Run both in `asyncio.gather` as specified in PRD §3.

**2. Wire real storyboard generation (Sprint 3)**
- Integrate LiteLLM targeting Claude Sonnet 4.5 for the full storyboard call.
- Add Claude Haiku 3.5 batch enrichment in a single call (all scenes in one JSON array).
- Validate output against the existing `StoryboardSchema` Pydantic model (already spec'd in Technical Spec §2).

**3. Wire real Kling video rendering (Sprint 4)**
- Implement a real `KlingAdapter` behind the existing `VideoRenderProvider` interface.
- Move rendering into actual Celery tasks with proper fan-out (`group` or `chord`) to parallelize scenes.
- Remove the sequential `for` loop from the API request path.

**4. Implement FFmpeg assembly (Sprint 4)**
- Call `ffmpeg -f concat -safe 0 -i filelist.txt -map 1:a -c:v copy final.mp4` subprocess after all scenes complete.
- Validate final duration vs. `audio_duration_seconds ± 0.5s`.
- Do the same for partial preview (first N scenes).

**5. Implement hard cost cap enforcement**
- In `render_job()`, after each scene's cost is added to `job.actual_cost_usd`, compare against `job.cost_cap_usd`.
- If exceeded: set remaining scenes to `failed`, set job status to `failed` with reason `"cost_cap_exceeded"`.

**6. Integrate Cloudflare R2 / S3-compatible storage**
- Replace `StorageService.write_bytes()` with `boto3` or `cloudflare-python` PUT to the R2 bucket.
- Generate pre-signed URLs for uploads and CDN-served URLs for downloads.

---

### 🟠 Priority 2 — Required for a credible MVP demo

**7. Fix Celery integration architecture**
- `create_job()` must enqueue the Celery task (`analyse_and_plan.delay(job.id)`) and return immediately with `status="queued"`.
- The analysis, planning, rendering, and assembly workers must run in the Celery worker process, not in the API request thread.
- This is the most critical architectural correction — without it, long uploads/renders will timeout and block the API server.

**8. Implement `CreditService`**
- Port the `deduct_credits` / `add_credits` logic from Technical Spec §1.4 to `backend/app/services/credit_service.py`.
- Hook `deduct_credits` into the render approval flow.

**9. Confirm and test SendGrid integration**
- Verify `NotificationService.send_job_complete_email()` makes a real SendGrid API call.
- Add fallback logging if email fails (should never crash the pipeline).

**10. Set up CI/CD**
- Add `.github/workflows/ci.yml` (or equivalent) with lint, `python -m compileall`, unit test, and Docker build steps.
- This is a Sprint 1 deliverable that is still missing.

**11. Remove `create_all` from `main.py` lifespan**
- Delete the `await conn.run_sync(Base.metadata.create_all)` call.
- Enforce schema-only-via-Alembic discipline to avoid production schema drift.

---

### 🟡 Priority 3 — Polish and completeness

**12.** Add `DELETE /api/jobs/{id}` endpoint (specified in PRD §5, §7).
**13.** Wire style preset selection in the Create Job frontend page.
**14.** Implement MSW mock service layer in frontend as specified in UI Design doc §7.
**15.** Add structured log fields (`job_id`, `scene_id`, `provider`, `cost`, `latency`) via `structlog`.
**16.** Refine cost estimate using actual per-provider pricing (Claude + Gemini + Kling breakdown).
**17.** Lock open spec items before Sprint 3 begins: storyboard rejection policy, regeneration attempt limits, launch style preset definitions.

---

## Summary

| Category | Count |
|---|---|
| Requirements fully met | 9 |
| Requirements partially met | 10 |
| Requirements not met (missing/mock) | 6 |
| **Total Phase 1 requirements reviewed** | **25** |

> [!IMPORTANT]
> The scaffold is architecturally sound — the state machine, API shape, schemas, WebSocket plumbing, and database models are all well-specified and correctly structured. However, **every AI/ML integration and every media processing step is a mock stub**. The project is at approximately **Sprint 1 completion level** (foundation + scaffold), not Sprint 4 (full MVP). Sprints 2–4 work remains entirely ahead.

> [!WARNING]
> The most critical architectural issue is that analysis, planning, and rendering currently run **synchronously inside the API request** rather than in Celery workers. This must be corrected before any real provider integrations are added, or the API server will hang during 10+ minute render jobs.
