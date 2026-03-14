# VIGEN SaaS Delivery Roadmap and Phase 1 Sprint Plan

## Summary
This plan synthesizes the full VIGEN document set, including the core working developer brief and architecture review, into a production-oriented roadmap for a scalable SaaS launch.

I am using the later strategic/product docs plus the architecture review as the source of truth where documents conflict. The main normalization is:
- Adopt a safer **5-phase roadmap** instead of the earlier compressed 4-phase framing
- Keep the approved core architecture: `Next.js + FastAPI + Celery + Redis + PostgreSQL + Cloudflare R2 + Cloudflare CDN`
- Use the architecture review’s simplifications for Phase 1: `librosa only`, direct `FFmpeg`, single Celery queue, `LiteLLM`, no Wan self-hosting in MVP, and no Prometheus/Grafana before scale

## 1. Executive Summary
VIGEN is a music-driven AI video generation SaaS for independent artists, creators, agencies, and later API integrators. The core business thesis is strong: reduce music video creation from weeks and thousands of dollars to minutes and a low per-job credit cost, while preserving trust through storyboard approval, cost transparency, and progress visibility.

Phase 1 should not attempt “full long-form AI studio.” It should deliver a narrow but production-ready MVP:
- authenticated users
- audio upload
- audio analysis
- AI storyboard generation
- storyboard approval gate
- parallel scene rendering through a provider abstraction
- preview + final assembly
- job history, download, and email completion notification

The MVP succeeds if a user can upload a short song, approve a storyboard, receive a watchable synced video, understand job progress, and regenerate a failed or weak scene without support intervention.

## 2. Document Insights

### Core product vision
VIGEN aims to become the default platform for music-driven video generation by turning uploaded audio into cinematic, beat-aligned videos with minimal user effort and acceptable unit economics.

### Target users
- Independent artists needing affordable music videos
- Social/video creators needing fast visual content
- Marketing agencies needing scalable campaign output
- Developers/integrators as a later expansion path

### Primary use cases
- Upload a music track and generate a synced video
- Review storyboard before GPU spend
- Track progress during long-running jobs
- Regenerate a specific scene
- Download or share the completed output
- Later: automate via API

### Key product features
- Audio upload and analysis
- AI storyboard generation
- Storyboard approval gate
- Parallel scene rendering
- Partial preview before full completion
- Final assembly with original audio
- Job history/dashboard
- Scene regeneration
- Completion notifications
- Credit-based billing foundation
- Style presets

### Technical architecture overview
- Frontend: `Next.js 14`, `shadcn/ui`, `Tailwind`, `Zustand`, `TanStack Query`, `Socket.IO`
- Backend: `FastAPI`, async DB access, JWT auth
- Async orchestration: `Celery + Redis`
- DB: `PostgreSQL`
- Media storage/CDN: `Cloudflare R2 + Cloudflare CDN`
- Pipeline: Analysis -> Planning -> Approval -> Rendering -> Assembly -> Delivery
- AI routing via `LiteLLM`
- Direct `FFmpeg` for assembly
- Provider abstraction for video generation to avoid lock-in

### AI and data pipeline overview
- `librosa` extracts BPM, beat map, onset/structure features
- `Gemini 2.0 Flash` handles multimodal audio mood/energy analysis
- `Claude Sonnet 4.5` generates storyboard JSON
- `Claude Haiku 3.5` handles batched prompt enrichment/review
- Primary video provider: `Kling 1.6`
- Phase 1 stores beat map, storyboard, cost, and scene-level status for observability and retries

### Infrastructure stack
- Dockerized monorepo
- FastAPI service
- Next.js web app
- Celery workers
- Redis broker/result backend
- PostgreSQL
- R2 object storage
- Cloudflare CDN
- Managed logs via `structlog + BetterStack/Axiom`
- CI/CD container build and staged deploy

### Integration dependencies
- LiteLLM-compatible LLM vendors
- Kling API
- Gemini API
- Claude API
- SendGrid for completion email
- Cloudflare R2/CDN
- Optional Phase 2+: OAuth/Supabase/social login
- Optional Phase 3+: Wan/RunPod fallback

### Potential technical risks
- GPU/video provider dependency and pricing volatility
- schema drift in storyboard contract
- long render abandonment
- cost overruns per job
- scene inconsistency across clips
- worker retries and pipeline idempotency
- auth/security gaps if rushed
- latency and partial-failure handling across async stages

### Missing or unclear specifications
These should be locked as product defaults for execution:
- storyboard rejection policy
- regeneration limits and who pays
- launch style preset definitions
- credit pricing final approval
- exact API rate limit policy for Phase 2+
- share-link access model
- vertical export behavior
- enterprise roles and tenancy for later phases

## 3. Phase-wise Roadmap

### Phase 1 - MVP Foundation
**Objective**  
Deliver a production-safe first-version SaaS that generates short music videos from uploaded audio with approval, progress tracking, and final delivery.

**Key deliverables**
- User auth and account basics
- Audio upload flow
- Job creation and tracking
- Audio analysis worker
- Storyboard generation worker
- Approval gate
- Parallel scene rendering through provider router
- Partial preview and final assembly
- Dashboard/history/download
- Email notification
- Baseline observability and CI/CD

**Major features**
- Upload MP3/WAV/FLAC
- BPM/mood/beat analysis
- Storyboard review and approve/reject
- Real-time progress UI
- Scene-level status
- Final MP4 output and download
- Job history
- Basic style presets
- Cost estimate and hard cost cap

**Dependencies**
- Auth
- Postgres schema
- R2 storage
- Redis/Celery
- LLM providers
- Kling provider
- SendGrid
- FFmpeg availability in worker runtime

**Success criteria**
- Authenticated user can upload short track and receive final watchable MP4
- Storyboard approval happens before rendering
- Progress and final status are visible without refresh-only dependence
- Partial preview appears before final completion
- 80%+ successful job completion in internal testing
- Cost cap enforced at job level
- Basic support/debug visibility via logs and DB state

**Estimated timeline**
- 8 weeks
- 4 sprints of 2 weeks

**Technical components**
- Frontend web app
- Backend REST + WebSocket
- Celery workers
- Postgres schema/migrations
- Object storage integration
- Notification service
- Logging/monitoring
- CI/CD

---

### Phase 2 - Core Product Capabilities
**Objective**  
Expand the MVP into a usable creator product with better retention, control, and monetization readiness.

**Key deliverables**
- Full scene regeneration UX
- Better storyboard rejection/regeneration flow
- Style preset gallery with sample assets
- Credit purchase and ledger UX
- Better retry/failure recovery
- Share links and better result pages

**Major features**
- Scene retry/regeneration
- Style preset selection
- Job dashboard polish
- Credit consumption visibility
- Shareable result links
- Stronger notifications
- Support tooling/admin basics

**Dependencies**
- Stable Phase 1 schema
- Payment/credit business sign-off
- Creative preset definitions
- Email and share-link policy

**Success criteria**
- User can complete first video with minimal friction
- Support load remains manageable
- Regeneration flow works without manual intervention
- Credit accounting is auditable

**Estimated timeline**
- 6 weeks

**Technical components**
- Frontend workflow polish
- Credit service
- Admin/support endpoints
- Asset preset library
- Share-link service

---

### Phase 3 - Intelligence and Automation
**Objective**  
Improve output quality, rendering resilience, and automation depth.

**Key deliverables**
- Prompt enrichment and quality review pipeline
- Provider fallback and clip caching
- Better scene consistency
- Optional developer-facing API beta

**Major features**
- Batched prompt optimization/review
- Clip cache
- Provider fallback routing
- Webhook-ready async job callbacks
- Better prompt/version analytics

**Dependencies**
- Stable provider abstraction
- Production metrics from Phases 1-2
- API policy and rate-limit decisions

**Success criteria**
- Lower cost/job
- Lower failure rate
- Faster mean completion time
- Measurable improvement in output quality consistency

**Estimated timeline**
- 6 weeks

**Technical components**
- LiteLLM policy layer
- Cache service
- Provider router extensions
- API/webhook contracts

---

### Phase 4 - Scale and Optimization
**Objective**  
Prepare the platform for sustained usage growth and operational efficiency.

**Key deliverables**
- Horizontal worker scaling
- stronger queue partitioning
- better SLIs/SLOs
- cost analytics
- autoscaling and operational hardening

**Major features**
- dedicated render queues
- autoscaling workers
- richer monitoring dashboards
- failure replay tooling
- data retention/cleanup policies

**Dependencies**
- traffic patterns and queue data
- scaled staging/perf environment

**Success criteria**
- predictable queue latency
- lower ops toil
- stable delivery under concurrent load
- clear unit economics dashboard

**Estimated timeline**
- 4 weeks

**Technical components**
- queue topology
- autoscaling
- monitoring stack
- cleanup jobs
- cost observability

---

### Phase 5 - Enterprise Readiness
**Objective**  
Productize VIGEN for agencies, partners, and future B2B/API revenue.

**Key deliverables**
- partner/developer API
- API keys and quotas
- role-based access improvements
- auditability and compliance posture
- enterprise support surfaces

**Major features**
- API access
- webhook callbacks
- admin roles/reporting
- usage tiers
- stronger security controls
- contractual data handling readiness

**Dependencies**
- billing/rate-limit policy
- customer segment validation
- hardened auth/authorization model

**Success criteria**
- external integrator can create and track jobs via API
- partner access is securely scoped
- audit/log trails are available
- pricing and quotas are enforceable

**Estimated timeline**
- 4-6 weeks

**Technical components**
- public API gateway
- auth extensions
- quotas
- webhooks
- admin and audit services

## 4. Phase 1 Detailed Plan

### MVP scope
Phase 1 must build the smallest production-credible workflow that proves value and validates unit economics:

- email/password auth with JWT access + refresh flow
- user account and protected job APIs
- audio upload to object storage via signed URL or backend-managed upload
- job creation and persisted job state machine
- audio analysis using `librosa` plus Gemini mood summary
- storyboard JSON generation and validation
- storyboard approval screen
- render dispatch only after explicit approval
- parallel scene rendering through a provider abstraction
- scene and job progress streaming
- partial preview after first scene batch threshold
- final FFmpeg assembly with original audio
- final delivery/download page
- basic dashboard/history
- completion email
- structured logging, cost tracking, and per-job cap enforcement
- CI/CD and environment setup sufficient for staging deployment

### Why these are critical
- Approval gate is the trust and cost-control backbone
- Upload -> storyboard -> render -> delivery is the core value loop
- Progress and preview reduce abandonment during 10+ minute waits
- Scene-level status and retries reduce failed-job waste
- Provider abstraction protects the business from vendor lock-in
- Cost tracking is required to validate the SaaS business model early

### Explicitly excluded from Phase 1
- social login
- public developer API
- webhook integrations
- Wan self-hosted GPU fallback
- advanced multi-format exports
- full billing/checkout purchase flow
- collaborative editing
- prompt editing before render
- character consistency mode
- stem splitting, captions, narration, and social publishing
- enterprise roles/tenancy
- full Prometheus/Grafana stack

### Phase 1 minimum viable product definition
A Phase 1 MVP is complete when:
- an internal user can sign up, upload a short audio track, review a generated storyboard, approve rendering, watch progress, preview the partial output, download the completed MP4, and see the job in dashboard history
- failures are visible and diagnosable from logs and DB status
- scene rendering is asynchronous and job cost is tracked/enforced
- the system can be demoed repeatedly without manual DB or storage repair

## 5. Phase 1 Sprint Plan

### Sprint 1 - Platform and Product Skeleton
**Sprint goal**  
Stand up the monorepo foundation, auth, core schema, and basic user/job shell.

**Features delivered**
- repo/runtime setup
- JWT auth
- initial database schema
- dashboard and create-job shell
- storage integration stub
- CI/CD skeleton

**Backend tasks**
- FastAPI project scaffold
- auth endpoints: register, login, refresh, me
- SQLAlchemy models and Alembic migrations for `users`, `jobs`, `scenes`, `style_presets`, `credit_transactions`, `audio_beat_maps`
- job state machine enums and service contracts
- signed-upload or upload endpoint design
- initial OpenAPI spec

**Frontend tasks**
- Next.js app shell and routing
- auth pages and protected routes
- dashboard layout
- create-job page skeleton
- query/state layer setup
- mock service toggle

**AI/data tasks**
- define storyboard JSON contract
- define audio analysis result shape
- define prompt-template versioning strategy

**Infrastructure tasks**
- Docker Compose for local stack
- Postgres/Redis wiring
- R2 bucket and environment contract
- secret/env template

**DevOps tasks**
- CI pipeline for lint/test/build
- staging deployment blueprint
- container image strategy

**QA tasks**
- auth test cases
- migration smoke validation
- API contract checklist

**Documentation tasks**
- developer setup guide
- env setup
- API auth usage notes

**Deliverables**
- running local stack
- auth flow working
- database schema applied
- frontend can log in and navigate protected pages

**Success metrics**
- local onboarding < 30 minutes
- auth success path working end-to-end
- migrations stable on clean DB

---

### Sprint 2 - Upload, Job Creation, and Analysis
**Sprint goal**  
Enable authenticated users to upload audio, create jobs, and complete analysis.

**Features delivered**
- audio upload flow
- job creation
- job detail page state shell
- analysis worker
- persisted beat map and audio analysis data

**Backend tasks**
- `POST /api/jobs`
- `GET /api/jobs`
- `GET /api/jobs/{id}`
- upload handling and file validation
- create job record and queue analysis
- Celery analysis task
- librosa extraction and Gemini mood enrichment
- store beat map and analysis JSON
- failure and retry handling for analysis

**Frontend tasks**
- drag/drop uploader
- upload progress
- redirect to job detail page
- job detail status states: queued, analysing, failed
- mock and real API adapters

**AI/data tasks**
- audio analysis schema validation
- job duration and file metadata extraction
- fallback behavior when Gemini fails

**Infrastructure tasks**
- FFmpeg/librosa worker image dependencies
- storage lifecycle paths for audio uploads
- queue worker runtime

**DevOps tasks**
- worker deployment definition
- staging environment variables for providers

**QA tasks**
- file type/size validation tests
- analysis pipeline integration tests
- failure-path tests for bad/corrupt uploads

**Documentation tasks**
- upload/API contract docs
- supported media/limits
- known failure codes

**Deliverables**
- uploaded audio stored
- job created and analysed asynchronously
- job detail page reflects real status

**Success metrics**
- successful upload + analysis for target sample files
- status transitions visible in DB and API
- no blocking request on analysis path

---

### Sprint 3 - Storyboard Generation and Approval
**Sprint goal**  
Produce valid storyboards and gate rendering behind explicit user approval.

**Features delivered**
- planning worker
- storyboard JSON validation
- storyboard review UI
- approve/reject actions
- cost estimate display

**Backend tasks**
- planning task after analysis completion
- LiteLLM integration
- Claude storyboard generation
- optional Haiku enrichment batch
- Pydantic validation of storyboard output
- `GET /api/jobs/{id}/scenes`
- `POST /api/jobs/{id}/approve`
- `POST /api/jobs/{id}/reject` or equivalent rejection endpoint
- cost estimate computation and storage
- storyboard regeneration counter and failure handling

**Frontend tasks**
- review page / scene grid
- scene cards with timing, mood, color, motion metadata
- approve CTA
- reject/regenerate CTA with reason field
- cost estimate component

**AI/data tasks**
- stabilize prompt templates
- lock storyboard schema and scene cardinality rules
- prompt version capture on job

**Infrastructure tasks**
- LLM secret/config management
- rate limiting and timeout policies for planning worker

**DevOps tasks**
- tracing/log fields for prompt version, provider, cost, latency

**QA tasks**
- schema validation tests
- invalid-JSON and malformed storyboard handling
- approval gate tests ensuring no render starts early

**Documentation tasks**
- storyboard schema contract
- planner prompt/version documentation
- approval UX and state transition notes

**Deliverables**
- job reaches `awaiting_approval`
- user can review and approve or reject
- cost estimate visible before render

**Success metrics**
- 100% of renderable jobs require approval first
- storyboard API shape stable for UI consumption
- planner failures surfaced clearly

---

### Sprint 4 - Rendering, Preview, Assembly, and Delivery
**Sprint goal**  
Complete the end-to-end video generation loop and make the MVP demoable.

**Features delivered**
- render worker fan-out
- provider abstraction
- progress streaming
- partial preview
- final assembly
- dashboard history
- email completion notice
- scene regeneration entry point
- logs/observability hardening

**Backend tasks**
- render router interface and Kling adapter
- per-scene task fan-out and aggregation
- scene status updates and retries
- partial preview assembly after threshold scene completion
- final FFmpeg concat and audio mapping
- final asset upload and metadata update
- `POST /api/jobs/{id}/scenes/{n}/retry`
- WebSocket or Socket.IO progress events
- SendGrid completion email
- cleanup/lifecycle jobs for intermediates
- cost cap enforcement during render stage

**Frontend tasks**
- live progress tracker
- scene timeline
- preview player during render
- final completion page
- dashboard history list with download/share actions
- basic scene regeneration action in completed job view

**AI/data tasks**
- prompt/provider metadata persistence
- scene-level cost and latency capture
- initial clip-cache interface defined even if cache is deferred

**Infrastructure tasks**
- worker concurrency tuning
- staging object/CDN delivery
- log aggregation wiring
- intermediate and final asset retention policy

**DevOps tasks**
- end-to-end staging pipeline
- deployment promotion checklist
- rollback/runbook basics

**QA tasks**
- e2e smoke flow from signup to download
- scene failure/retry tests
- partial preview validation
- duration sync verification
- load test on concurrent job execution

**Documentation tasks**
- operator runbook
- support/debug guide
- internal demo script
- release readiness checklist

**Deliverables**
- full MVP flow operational in staging
- internal demo-ready product
- supportable logs and failure visibility

**Success metrics**
- internal user can complete flow without engineer intervention
- preview available before final completion
- final video duration matches source audio within tolerance
- completion email sends reliably

## 6. Engineering Task Breakdown

### Authentication and user accounts
- Implement register/login/refresh/me endpoints; Role: Backend; Dependencies: DB schema; Complexity: Medium
- Build auth UI and protected routing; Role: Frontend; Dependencies: auth API; Complexity: Medium
- Add password hashing, token expiry, refresh-token storage; Role: Backend; Dependencies: Redis/Postgres; Complexity: Medium
- Create auth integration and security tests; Role: QA; Dependencies: auth flow; Complexity: Medium

### Audio upload and job creation
- Implement upload validation and storage path strategy; Role: Backend; Dependencies: R2; Complexity: Medium
- Build drag/drop upload component and progress UX; Role: Frontend; Dependencies: upload API; Complexity: Medium
- Create job creation service and initial state transitions; Role: Backend; Dependencies: schema; Complexity: Medium
- Validate large-file behavior and corrupted media handling; Role: QA; Dependencies: upload pipeline; Complexity: Medium

### Audio analysis pipeline
- Implement Celery analysis worker; Role: Backend; Dependencies: Redis/Celery; Complexity: Medium
- Extract BPM/beat/onset data with librosa; Role: AI/Backend; Dependencies: worker runtime; Complexity: Medium
- Integrate Gemini mood analysis and fallback behavior; Role: AI; Dependencies: provider config; Complexity: Medium
- Persist beat map and audio analysis results; Role: Backend; Dependencies: schema; Complexity: Medium
- Add analysis pipeline tests with sample tracks; Role: QA/AI; Dependencies: fixture audio; Complexity: Medium

### Storyboard generation and approval
- Define locked storyboard JSON schema and validators; Role: Backend/AI; Dependencies: product decision; Complexity: High
- Implement planning worker with LiteLLM and Claude; Role: Backend/AI; Dependencies: analysis output; Complexity: High
- Build storyboard review screen and approval UX; Role: Frontend; Dependencies: scenes API; Complexity: Medium
- Implement approve/reject/regenerate endpoints and state transitions; Role: Backend; Dependencies: state machine; Complexity: Medium
- Create schema-failure and bad-output handling tests; Role: QA; Dependencies: planner; Complexity: Medium

### Rendering and provider orchestration
- Define provider router interface for scene generation; Role: Backend/AI; Dependencies: planning output; Complexity: High
- Implement Kling provider adapter; Role: Backend/AI; Dependencies: provider creds; Complexity: High
- Create scene fan-out/fan-in Celery orchestration; Role: Backend; Dependencies: scenes table; Complexity: High
- Track scene-level cost, latency, and retries; Role: Backend; Dependencies: render tasks; Complexity: Medium
- Validate idempotency and partial-failure recovery; Role: QA/Backend; Dependencies: worker flow; Complexity: High

### Preview, assembly, and delivery
- Implement preview assembly threshold logic; Role: Backend; Dependencies: render completion events; Complexity: High
- Implement final FFmpeg concat/audio mapping; Role: Backend; Dependencies: rendered clips; Complexity: Medium
- Upload final assets and update metadata; Role: Backend; Dependencies: R2; Complexity: Medium
- Build preview/completion player UI; Role: Frontend; Dependencies: job detail API; Complexity: Medium
- Verify sync/duration across representative media; Role: QA; Dependencies: output fixtures; Complexity: Medium

### Dashboard, notifications, and regeneration
- Build jobs list/history page; Role: Frontend; Dependencies: jobs API; Complexity: Low
- Implement SendGrid completion email; Role: Backend; Dependencies: status completion; Complexity: Low
- Expose scene retry endpoint and action; Role: Backend; Dependencies: scene IDs/status; Complexity: Medium
- Add scene regeneration action in UI; Role: Frontend; Dependencies: retry API; Complexity: Low
- Test completed-job usability and notification reliability; Role: QA; Dependencies: full flow; Complexity: Medium

### Infrastructure, DevOps, and quality
- Build Docker images and compose stack; Role: DevOps; Dependencies: runtime choices; Complexity: Medium
- Set up staging deployment and CI/CD; Role: DevOps; Dependencies: repo structure; Complexity: Medium
- Wire structured logging and log aggregation; Role: DevOps/Backend; Dependencies: env/config; Complexity: Medium
- Create release checklist, runbook, and failure triage docs; Role: DevOps/QA; Dependencies: working staging flow; Complexity: Low
- Run unit/integration/e2e/load test suites; Role: QA; Dependencies: implemented services; Complexity: Medium

## 7. Recommended Team Structure
Ideal Phase 1 team:
- 1 Product Manager
- 1 Tech Lead / Solution Architect
- 2 Backend Engineers
- 1 Frontend Engineer
- 1 AI/ML Engineer
- 1 DevOps Engineer
- 1 QA Engineer
- 1 UI/UX Designer shared part-time

Recommended Phase 1 size:
- Core full-time team: 7
- With design support: 8 total contributors

Lean minimum possible:
- 5 people
- This increases timeline risk and reduces quality/reliability margin

## 8. Technical Implementation Strategy

### Backend architecture
- Modular FastAPI service with clear boundaries: auth, jobs, scenes, storage, credits, notifications, provider routing
- Service layer owns state transitions; workers never bypass domain rules
- Use async DB access, strict Pydantic validation, and idempotent task patterns
- Central provider abstraction for LLM and video generation

### Frontend architecture
- Next.js App Router
- TanStack Query for server state
- Zustand only for small client/session/UI state
- Route pattern centered on `/dashboard`, `/create`, `/job/[id]`, `/job/[id]/review`
- MSW-backed mock layer retained for parallel frontend development

### Database strategy
- PostgreSQL as source of truth for users, jobs, scenes, credits, beat maps, and prompt/version metadata
- Store flexible AI payloads as `JSONB` where schema is evolving but validate before persist
- Use explicit enums/state machine transitions
- Track costs, timestamps, failures, and provider/model metadata from day one

### AI orchestration
- Route all model calls through LiteLLM
- Use model-per-task strategy rather than one general model
- Batch prompt enrichment/review tasks
- Validate all LLM output against schema
- Capture prompt template version on each job
- Keep provider abstraction stable so fallback or replacement is configuration-first

### API design
Important public/internal Phase 1 interfaces:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`
- `POST /api/jobs`
- `GET /api/jobs`
- `GET /api/jobs/{id}`
- `GET /api/jobs/{id}/scenes`
- `POST /api/jobs/{id}/approve`
- `POST /api/jobs/{id}/reject` or equivalent status mutation
- `POST /api/jobs/{id}/scenes/{scene_index}/retry`
- progress stream via Socket.IO/WebSocket namespace tied to job ID

### Authentication and security
- Phase 1 default: custom JWT auth with refresh token
- Store access token short-lived, refresh token in secure httpOnly cookie
- Signed URLs or tightly scoped upload endpoints for media ingress
- Role field reserved for admin/API partner extension
- Secrets only via env/secret manager
- Validate ownership on every job/scene endpoint
- Record upload hashes and avoid cross-user content reuse

### Monitoring and logging
- Use structured logs with correlation IDs: `job_id`, `scene_id`, `user_id`, `provider`, `model`, `latency`, `cost`
- Centralize logs in BetterStack or Axiom
- Track MVP operational metrics: job completion rate, stage latency, render failures, cost/job, preview generation rate
- Defer heavy metrics infrastructure until Phase 4

### Deployment workflow
- Dockerized services with separate API, frontend, and worker images
- CI gates: lint, unit tests, integration tests, build
- Deploy to staging first, then production after smoke suite
- Maintain rollback path at image/version level
- Keep local dev parity with Docker Compose

## 9. Risks and Mitigation

### Technical risks
- Video provider dependency  
Mitigation: render-router abstraction, no direct provider calls in business logic
- Invalid LLM storyboard output  
Mitigation: strict schema validation, retries, prompt versioning
- Scene failure causing full-job failure  
Mitigation: scene-level retries and partial completion tracking
- Audio/video sync drift  
Mitigation: original-audio mapping and duration validation
- worker memory or timeout issues  
Mitigation: timeouts, worker recycling, stage-specific retry policy

### Product risks
- users abandon during long renders  
Mitigation: partial preview, real-time progress, completion email
- users do not trust AI output  
Mitigation: approval gate, cost estimate, visible scene plan
- weak first-use experience  
Mitigation: curated presets, guided create flow, stable dashboard/history

### Infrastructure risks
- queue backlog and worker starvation  
Mitigation: cap concurrency, track queue depth, scale workers by demand
- storage/CDN cost drift  
Mitigation: retention policy, intermediate cleanup, cache-control strategy
- fragile staging/prod parity  
Mitigation: containerized environments and deployment checklist

### Cost risks
- GPU costs exceed pricing assumptions  
Mitigation: hard cost cap, short-scene limits, provider telemetry, caching in later phase
- excessive LLM spend  
Mitigation: batch low-value calls, use smaller models for non-creative tasks
- support cost from failures  
Mitigation: observable state machine, clear user status, internal runbooks

## 10. Delivery Timeline

### High-level schedule
- Phase 1: 8 weeks
- Phase 2: 6 weeks
- Phase 3: 6 weeks
- Phase 4: 4 weeks
- Phase 5: 4-6 weeks

### Phase 1 milestones
- End of Sprint 1: auth, schema, local/staging foundation
- End of Sprint 2: upload and analysis working asynchronously
- End of Sprint 3: storyboard generation and approval gate demo
- End of Sprint 4: full staging MVP from signup to final download

### Demo checkpoints
- Demo 1: authenticated upload and job creation
- Demo 2: analysis results and storyboard review
- Demo 3: approved render with live progress and preview
- Demo 4: complete MVP flow, scene retry, dashboard history, email completion

## Important API, Interface, and Type Decisions
These are the key contracts the implementers should treat as locked for Phase 1:
- Job lifecycle uses explicit persisted states: `pending`, `queued`, `analysing`, `planning`, `awaiting_approval`, `rendering`, `assembling`, `complete`, `failed`, `cancelled`
- Storyboard is a validated JSON contract with scene timing, visual description, mood, motion, lighting, camera, color palette, and beat-boundary metadata
- Beat map persists separately from generic job metadata for efficient retrieval and traceability
- Scene-level retry exists in Phase 1, but pre-render prompt editing is excluded
- Access is user-scoped; all job and scene reads/writes require ownership checks

## Test Plan
- Unit tests for auth, job services, state transitions, storage helpers, and credit/cost logic
- Integration tests for upload, analysis, planning, approval, render orchestration, assembly, and notification
- Contract tests for storyboard JSON validation and provider adapter responses
- End-to-end tests for signup -> upload -> approve -> preview -> download
- Failure-path tests for bad uploads, provider timeout, invalid LLM JSON, scene retry, and job cancellation
- Load tests for concurrent jobs and queue latency
- Acceptance scenarios:
  - first-time user completes one short video without support
  - failed scene can be retried without rerendering completed scenes
  - no render begins before approval
  - final audio duration matches source within tolerance
  - completion email and dashboard history reflect final state correctly

## Assumptions and Defaults
- The strategic PRD v2 and architecture review override earlier docs when recommendations conflict
- Phase 1 uses email/password auth only; social login is deferred
- Phase 1 uses Kling as the only active render provider behind an abstraction layer; Wan fallback is deferred
- Phase 1 keeps a single Celery queue for simplicity
- Phase 1 omits billing checkout, but includes the credit ledger foundation and cost tracking
- Style presets launch as a static curated library, not LLM-generated
- Monitoring in Phase 1-3 uses structured logs plus managed aggregation, not self-hosted metrics stack
- Phase 1 timeline is expanded to 8 weeks so the MVP is production-ready rather than just technically demonstrable
