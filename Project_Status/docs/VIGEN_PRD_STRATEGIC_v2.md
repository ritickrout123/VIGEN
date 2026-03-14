# VIGEN — Strategic Product Requirements Document
**Version:** 2.0 | **Status:** Internal Working Draft | **Date:** March 2026  
**Prepared by:** CTO / Head of Product Review

---

## 1. Product Vision & Value Proposition

### The "Why"
Traditional music video production costs $5,000–$50,000+ and requires a production team, editor, and weeks of turnaround. Independent artists, content creators, and agencies are locked out of high-quality visual storytelling by cost and complexity.

VIGEN eliminates that barrier. Upload a track. Get a cinematic, beat-synchronized music video in under 15 minutes.

### The "Who"
| Persona | Core Need | Willingness to Pay |
|---|---|---|
| Independent Artist | Affordable music video for YouTube/Spotify | $10–30/video |
| Social Media Creator | Fast visual content for Reels/TikTok | $5–15/video |
| Marketing Agency | Scalable campaign video production | $50–200/video (volume) |
| Developer / Integrator | Stable API for automated pipelines | Monthly API subscription |

### North Star Metric
**Videos generated per active user per month.** Everything else is a leading indicator of this.

### Strategic Goals
1. Democratize music video creation for the 50M+ independent artists globally
2. Achieve < $6 cost-per-job at scale (enabling profitable pricing at $15–25/video)
3. Build a defensible API moat for B2B/developer revenue by Phase 4
4. Reach 80%+ job completion rate before public launch

---

## 2. Optimized Feature List

### CORE / MUST-HAVE (Phase 1–3)

#### P0 — Launch Blockers
- **Audio upload & analysis** — MP3/WAV/FLAC up to 200MB; extract BPM, beat timestamps, mood, energy arc via librosa + Gemini 2.0 Flash
- **AI storyboard generation** — Claude Sonnet 4.5 generates scene-by-scene plan (timing, visual prompt, camera style, color palette, mood) synchronized to beat map
- **Storyboard approval gate** — User reviews and approves scene plan *before* any GPU cost is incurred. This is non-negotiable for trust and cost control.
- **Parallel scene rendering** — Celery fan-out renders all scenes simultaneously via Kling 1.6 API; auto-fallback to Wan 2.1 on failure
- **Video assembly** — FFmpeg concat with `-c copy` (lossless, 5× faster); original audio mapped directly; bar-level beat sync as default
- **Partial video preview** — After first 5 scenes complete (~30% progress), assemble and serve a watchable preview. Highest single-impact UX feature.
- **Job progress tracking** — Real-time WebSocket updates (stage, %, scenes complete/total, ETA)
- **Download & share** — MP4 H.264 download + shareable link with copy-to-clipboard

#### P1 — Required for Retention
- **Per-scene regeneration** — User clicks any scene in the timeline, edits the prompt, re-renders only that clip. Backend endpoint already exists; this is a 1-day frontend task.
- **Job completion notification** — Email via SendGrid when render finishes. Users leave the tab during a 10-min render. Without this, support tickets spike.
- **Style preset gallery** — 6–8 curated visual styles (cyberpunk, cinematic, anime, etc.) with a 10-second sample clip per preset. Static JSON library — no LLM cost.
- **Pre-render cost estimate** — Show LLM + GPU + storage cost breakdown before render starts. Approval gate for jobs estimated over $5.
- **Credit / token system** — Pre-paid credits decouple UX from API cost volatility. Suggested: $10 = 100 credits; 10-min video = 25 credits; 3-min video = 10 credits.
- **Job history dashboard** — List of past jobs with status, thumbnail, duration, download button.

#### P2 — Competitive Differentiation
- **API access for developers** — REST API with JWT auth and webhook callbacks. Opens B2B revenue stream with minimal backend work.
- **Multi-format export** — MP4 H.264 (default), 9:16 vertical crop for Reels/TikTok, ProRes for professional editors
- **Share link with optional password** — First viral distribution vector; password option for client work
- **Guided first-video onboarding** — Pre-selected example tracks, beat-sync explanation, time estimate shown upfront. Reduces first-session drop-off.

### VALUE-ADD / NICE-TO-HAVE (Phase 4+)

- **Character consistency mode** — Flux 1.1 Pro reference image + IP-Adapter for consistent characters across scenes
- **Stem splitting / narration** — Demucs vocal separation + ElevenLabs TTS for narration scenes (opt-in, default off)
- **Scene prompt editing** — User edits visual prompts on the storyboard before rendering
- **Collaborative editing** — Multi-user job access for agency workflows
- **Automated social publishing** — Direct publish to YouTube, Instagram, TikTok
- **Beat-level sync (advanced)** — Opt-in mode for users who want rapid-cut edits
- **Video remix** — Re-run pipeline on existing job with different style preset
- **Prometheus + Grafana monitoring** — Defer until Phase 4; use structured logging + managed log aggregator (Axiom/BetterStack) until then

---

## 3. Technical Considerations

### Recommended Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js 14 (App Router) + shadcn/ui + Tailwind | Established, fast to build, SSR for SEO |
| Client State | Zustand | Lightweight, no boilerplate |
| Server State | TanStack Query | Caching, background refetch, optimistic updates |
| Real-time | Socket.IO | Job progress streaming |
| Backend API | FastAPI (Python) | Async-native, Pydantic validation, fast |
| Job Queue | Celery + Redis | Proven, horizontally scalable, retry logic |
| LLM Router | LiteLLM | Provider-agnostic, cost logging, fallback routing |
| Audio Analysis | librosa only (drop Essentia) | librosa covers all required features; Essentia adds a C++ dep for zero gain |
| Video Assembly | FFmpeg subprocess with `-c copy` (drop MoviePy) | 5× faster, lossless, one fewer Python dep |
| Primary Video Gen | Kling 1.6 API | Best quality/cost ratio for 5s clips |
| Fallback Video Gen | Wan 2.1 on RunPod RTX 4090 (not H100) | 3.4× cheaper than H100 for identical 720p output |
| Reference Images | Flux 1.1 Pro via fal.ai | Character consistency keyframes |
| Audio Mood AI | Gemini 2.0 Flash | Only model with native audio input |
| Scene Planning | Claude Sonnet 4.5 | Quality-critical creative work |
| Prompt Enrichment | Claude Haiku 3.5 (batched, not GPT-4o) | 10× cheaper, batch all 30 scenes in 1 call |
| Database | PostgreSQL (async via asyncpg) | Relational, proven, Alembic migrations |
| Object Storage | Cloudflare R2 | S3-compatible, no egress fees, CDN-integrated |
| CDN | Cloudflare | Edge delivery, Cache-Control on final videos |
| Monitoring (P1–3) | structlog + Axiom/BetterStack free tier | Defer Prometheus/Grafana until Phase 4 |
| Containerization | Docker + Docker Compose | Dev parity, easy scaling |

### Architecture Summary (Orchestrator Pattern)

```
User Upload
    ↓
FastAPI Backend → PostgreSQL (job record created)
    ↓
Celery Queue
    ↓
[Analysis Worker]  ←→  librosa (BPM, beats) + Gemini (mood, arc) — run in parallel via asyncio.gather
    ↓
[Planning Worker]  ←→  Claude Sonnet 4.5 (storyboard) → Claude Haiku 3.5 (batch prompt enrichment, 1 call)
    ↓
[Storyboard Approval Gate — user action]
    ↓
[Render Workers × N]  ←→  Kling 1.6 API (fallback: Wan 2.1 on RunPod RTX 4090)
    ↓ (partial assembly at 5 scenes)
[Assembly Worker]  ←→  FFmpeg -c copy concat + original audio map
    ↓
Cloudflare R2 → CDN → User
```

### Key Architectural Decisions & Rationale

**1. Never call Kling (or any video gen provider) directly from business logic.**  
All video generation goes through a router interface. Provider lock-in is the highest long-term strategic risk. Kling pricing has changed 2–3× in 12 months historically. One config change must be sufficient to swap providers.

**2. Bar-level beat sync as default (every 4 beats), not beat-level.**  
At 128 BPM, beat-level sync = 2 cuts/second. This feels chaotic and will generate negative beta feedback. Bar-level is how professional editors cut. Beat-level is an advanced opt-in.

**3. Prompt template versioning from Day 1.**  
Add `prompt_template_version` to the Job schema in Phase 1. Without it, quality regressions are impossible to diagnose. This is a 30-minute schema change that prevents a painful forensic exercise later.

**4. Clip result caching (Redis + R2, 7-day TTL).**  
Key: `hash(prompt + style_preset + seed)` → R2 clip URL. Creative users iterate — same track, different style. 20–30% cache hit rate is realistic. At $0.015–0.02/clip, saving 6–9 clips/job = $0.09–0.18 saved per job.

**5. Single Celery queue in Phase 1–2.**  
Multi-queue config adds ops overhead before it's needed. Introduce dedicated GPU queue only when Wan 2.1 workers come online in Phase 3.

### Cost Model (Optimized)

| Component | Current Estimate | Optimized Estimate |
|---|---|---|
| Claude Sonnet 4.5 (planning) | ~$0.06 | ~$0.06 |
| Claude Haiku 3.5 (enrichment, batched) | — | ~$0.03 (was $0.45 GPT-4o) |
| Gemini 2.0 Flash (audio) | ~$0.02 | ~$0.02 |
| Kling 1.6 (30 × 5s clips) | ~$6–9 | ~$4–6 (with caching) |
| Flux 1.1 Pro (keyframes, cached) | ~$0.25 | ~$0.10 |
| R2 storage + CDN egress | ~$0.01 | ~$0.01 |
| **Total per 10-min job** | **$8.50–12.00** | **$4.20–6.00** |

At $15–25 pricing per video, the optimized stack yields 60–80% gross margin.

---

## 4. Risk & Mitigation Table

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Kling API price increase or shutdown | HIGH | MEDIUM | Abstract all video gen behind a router interface. Never call Kling from business logic. One config change = provider swap. |
| GPU cost overrun per job | HIGH | HIGH | Hard per-job cost cap enforced at Celery task level (not just documented). Kill job mid-run if cap exceeded. Pre-render cost estimate shown to user. |
| Beat sync feels wrong to users (2 cuts/sec) | HIGH | HIGH | Default to bar-level sync (every 4 beats). Fix before any video is shown externally. |
| LLM quality regression undetected | HIGH | HIGH | Prompt versioning on Job schema from Day 1. Canonical test suite of 5 tracks. CLIP similarity baseline on every prompt change. |
| Visual inconsistency across clips | MEDIUM | HIGH | Lock seed + prompt template per character. Flux reference image via IP-Adapter. CLIP similarity score between consecutive clips; auto-retry below threshold. |
| User abandons during 10-min render | MEDIUM | HIGH | Partial preview at 30% progress (5 scenes). Job completion email notification. Real-time progress with ETA. |
| Celery worker memory leak on long jobs | MEDIUM | MEDIUM | `max_tasks_per_child=50` to recycle workers. Hard timeout on all FFmpeg processes. |
| Gemini returns inconsistent JSON | MEDIUM | MEDIUM | Strict Pydantic validation. After 3 Gemini failures, fall back to librosa-only + Claude text description. |
| DMCA / copyright on user audio | HIGH | LOW | ToS: user certifies audio rights. Log input audio hashes. Never use user audio for training or cross-user caching. |
| R2 egress spike on viral sharing | LOW | MEDIUM | `Cache-Control: public, max-age=86400` on final videos. Serve from Cloudflare CDN edge, not R2 origin. |
| Long audio exceeds Gemini context window | LOW | LOW | Chunk into 3-minute segments. Merge `energy_arc` arrays. Deduplicate `key_moments` by timestamp. |
| FFmpeg audio sync drift | LOW | LOW | Always use `-map 1:a` (original audio, never clip audio). Validate final duration vs audio duration ±0.5s. |

---

## 5. Preparation for Development

### What Is Ready for Phase 1 Sprint Planning

The following are fully defined and can be sprint-planned immediately:

- **Pipeline architecture** — 4-stage decoupled pipeline (Analysis → Planning → Rendering → Assembly) via Celery is well-specified
- **Tech stack** — All technology choices are confirmed (see Section 3)
- **Folder structure** — Monorepo layout defined (`backend/`, `frontend/`, `infra/`)
- **API contract** — Core endpoints defined: `POST /api/jobs`, `GET /api/jobs/{id}`, `GET /api/jobs/{id}/scenes`, `POST /api/jobs/{id}/approve`, `POST /api/jobs/{id}/scenes/{n}/retry`, `DELETE /api/jobs/{id}`
- **Data models** — Core entities defined: Users, Jobs, Scenes, VideoClips, Credits, StylePresets
- **Phase gate criteria** — Hard acceptance criteria per phase are documented
- **Cost targets** — $4.20–6.00 per 10-min job (optimized stack)
- **Worker types** — 4 worker types defined with queue assignments
- **UI component list** — All components specified with mock data strategy (MSW)
- **Environment variables** — Full `.env.example` template documented

### What Needs More Definition Before Sprint Planning

The following items are currently too vague to build without clarification:

#### CRITICAL — Blocks Phase 1
1. **Authentication strategy** — JWT is mentioned but the auth flow is not defined. Who issues tokens? Is there social login (Google/GitHub)? Is there a registration/email-verification flow? What are the session expiry rules?
2. **Database schema specifics** — Table names and relationships are listed but column-level schema is not defined. The `credits` table structure, the `style_presets` schema, and the `jobs` state machine transitions need to be fully specified before migrations are written.
3. **Storyboard JSON schema** — The exact structure of the storyboard JSON that Claude outputs (and that the frontend consumes) must be locked before Phase 1 ends. Changing this schema mid-build is expensive.
4. **Beat map storage format** — How are beat timestamps stored in the database? Array of floats in a JSONB column? Separate table? This affects the planning worker and the assembly worker.

#### IMPORTANT — Blocks Phase 2
5. **Credit pricing model** — The suggested model ($10 = 100 credits, 10-min = 25 credits) needs sign-off. Once the credit ledger is in the schema, changing the pricing model requires a migration.
6. **Style preset definitions** — The 6–8 launch presets need to be written (name, description, prompt modifier string, sample clip). This is a product/creative decision, not an engineering one, but it blocks the preset gallery UI.
7. **Storyboard approval UX** — What happens if the user rejects the storyboard? Can they provide feedback? Does the system regenerate automatically? How many regeneration attempts are allowed before a job is cancelled?
8. **Scene regeneration limits** — Is there a cap on how many times a single scene can be regenerated? Who pays for regenerations — the user's credits or the platform?

#### NICE TO HAVE — Blocks Phase 3+
9. **API rate limits and tiers** — For developer API access, what are the rate limits per tier? What does the API pricing model look like vs. the consumer credit model?
10. **Multi-format export specs** — For the 9:16 vertical crop, what is the crop strategy? Center crop? Smart crop based on scene content? This affects FFmpeg assembly logic.
11. **Character consistency definition** — What constitutes a "character"? Is it user-uploaded reference images? AI-generated from a text description? This is a significant scope question for Phase 4.
12. **Notification preferences** — Email only, or also in-app + webhook? What events trigger notifications beyond job completion (e.g., job failed, scene regeneration complete)?

---

## 6. Phase Roadmap Summary

| Phase | Weeks | Goal | Gate Criteria |
|---|---|---|---|
| **Phase 1** | 1–6 | Core pipeline: text prompt → 30-second MP4 | Upload any MP3 via API → receive watchable 30s MP4 with original audio synced |
| **Phase 2** | 7–12 | Music-driven multi-scene + retention features | Upload 3-min song → 3-min MP4 where cuts align to musical beats |
| **Phase 3** | 13–18 | Long-form + parallel rendering + UI polish | Upload 10-min song → full video in < 20 min, cost < $12, all 30 scenes rendered |
| **Phase 4** | 19–26 | Product polish, billing, beta launch | 10 internal users complete full flow without guidance; error rate < 5% |

### Phase 1 Priority Order (Weeks 1–6)
1. Docker Compose dev environment + PostgreSQL + Redis
2. FastAPI skeleton + JWT auth
3. S3/R2 upload with pre-signed URLs
4. librosa audio analysis worker
5. Gemini mood analysis (parallel with librosa)
6. Claude Sonnet storyboard generation
7. Kling scene rendering worker (single scene first, then fan-out)
8. FFmpeg assembly with `-c copy`
9. Job status API + WebSocket progress
10. Basic Next.js UI: upload → progress → video player

**Do NOT build in Phase 1:** Wan 2.1 GPU worker, Essentia, MoviePy, Prometheus/Grafana, storyboard editing UI, credits/billing, multi-format export.

---

## 7. Quick Wins — Implement Before Writing Any Phase 1 Code

These are configuration and architecture decisions that are cheap now and expensive to retrofit:

| # | Action | Effort | Impact |
|---|---|---|---|
| 1 | Replace GPT-4o with Claude Haiku 3.5 for prompt enrichment in LiteLLM config | 2 hrs | Save $0.15–0.25/job |
| 2 | Batch all 30 prompt enrichment calls into 1 Haiku call (JSON array in/out) | 3 hrs | Save 15–20s latency |
| 3 | Remove Essentia — use librosa only | 2 hrs | Remove C++ dep, simplify Phase 1 |
| 4 | Replace MoviePy with FFmpeg subprocess | 4 hrs | 3–5× faster assembly |
| 5 | Add `-c copy` to FFmpeg concat command | 1 hr | 5× faster, lossless output |
| 6 | Run librosa + Gemini in parallel (asyncio.gather) | 2 hrs | Save 15–45s per job |
| 7 | Set bar-level beat sync as default (every 4 beats) | 2 hrs | Prevents negative beta feedback |
| 8 | Make Demucs opt-in (default off) | 1 hr | Save 20–40s per job |
| 9 | Add `prompt_template_version` to Job schema | 0.5 hrs | Enables quality regression tracking |
| 10 | Add storyboard approval gate before GPU dispatch | 6 hrs | Highest single retention impact |

---

*End of Document — VIGEN Strategic PRD v2.0*
