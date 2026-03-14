"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchJob, retryScene, subscribeToJobProgress } from "../../../lib/api.js";
import { getStoredSession } from "../../../lib/auth.js";
import {
  ActionLink, ErrorBanner, PipelineTracker, ProgressBar,
  SceneCard, Skeleton, StatRow, StatusBadge, VideoPlayer,
} from "../../../components/ui.jsx";

function fmt(s) {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
function fmtCost(v) { return v != null ? `$${Number(v).toFixed(2)}` : "—"; }

/* Status-specific messaging */
const STATUS_MSG = {
  pending:           { icon: "⏳", title: "Job queued", body: "Your job is waiting to start." },
  queued:            { icon: "⏳", title: "Job queued", body: "Your job is in the queue and will start shortly." },
  analysing:         { icon: "🔍", title: "Analysing audio", body: "Extracting BPM, beat map, and mood from your track." },
  planning:          { icon: "📋", title: "Generating storyboard", body: "Claude is crafting a scene-by-scene visual plan." },
  awaiting_approval: { icon: "✅", title: "Storyboard ready", body: "Review the AI-generated storyboard and approve to start rendering." },
  rendering:         { icon: "🎬", title: "Rendering scenes", body: "Scenes are rendering in parallel. A preview will appear shortly." },
  assembling:        { icon: "⚙️", title: "Assembling video", body: "Stitching scenes together with your original audio." },
  complete:          { icon: "🎉", title: "Video complete", body: "Your music video is ready to download and share." },
  failed:            { icon: "⚠️", title: "Job failed", body: "Something went wrong. See the failure reason below." },
  cancelled:         { icon: "🚫", title: "Job cancelled", body: "This job was cancelled." },
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [liveProgress, setLiveProgress] = useState(null);
  const [retryError, setRetryError] = useState("");
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (!getStoredSession()) { router.push("/login"); return; }
    fetchJob(params.id)
      .then((data) => { setJob(data); setError(""); })
      .catch((err) => setError(err.message || "Failed to load job."))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  useEffect(() => {
    if (!job) return;
    const progressible = ["queued", "analysing", "planning", "rendering", "assembling"].includes(job.status);
    if (!progressible) return;

    cleanupRef.current?.();
    const cleanup = subscribeToJobProgress(
      job.id,
      (event) => {
        setLiveProgress(event);
        setJob((prev) => {
          if (!prev) return prev;
          const next = { ...prev };
          if (event.scenes_complete != null) next.scenes_completed = event.scenes_complete;
          if (event.stage === "done") { next.status = "complete"; next.current_stage = "done"; }
          else if (event.stage === "assembling") { next.status = "assembling"; next.current_stage = "assembly"; }
          else if (event.stage === "rendering") { next.status = "rendering"; next.current_stage = "rendering"; }
          return next;
        });
      },
      () => fetchJob(params.id).then(setJob).catch(() => {}),
    );
    cleanupRef.current = cleanup;
    return () => cleanup();
  }, [job?.id, job?.status, params.id]);

  async function handleRetry(sceneIndex) {
    setRetryError("");
    try {
      const refreshed = await retryScene(job.id, sceneIndex, "Manual retry");
      setJob(refreshed);
    } catch (err) {
      setRetryError(err.message || "Retry failed.");
    }
  }

  if (loading) {
    return (
      <div className="vg-shell">
        <main className="vg-page">
          <div className="vg-card" style={{ display: "grid", gap: "20px" }}>
            <Skeleton height={28} width="50%" />
            <Skeleton height={14} width="30%" />
            <Skeleton height={6} />
            <div style={{ display: "flex", gap: "8px" }}>
              {[1,2,3,4,5,6].map((i) => <Skeleton key={i} height={34} width={88} style={{ borderRadius: "50px" }} />)}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vg-shell">
        <main className="vg-page">
          <ErrorBanner message={error} onRetry={() => { setLoading(true); fetchJob(params.id).then(setJob).catch((e) => setError(e.message)).finally(() => setLoading(false)); }} />
          <ActionLink href="/dashboard" secondary>← Back to dashboard</ActionLink>
        </main>
      </div>
    );
  }

  if (!job) return null;

  const pct = job.scenes_total
    ? Math.round((job.scenes_completed / job.scenes_total) * 100)
    : (liveProgress?.percent ?? 0);

  const isActive = ["queued", "analysing", "planning", "rendering", "assembling"].includes(job.status);
  const scenes = job.scenes || [];
  const showRetry = ["rendering", "complete", "failed"].includes(job.status);
  const msg = STATUS_MSG[job.status] || { icon: "❓", title: job.status, body: "" };

  return (
    <div className="vg-shell">
      <main className="vg-page">
        {/* ── Header card ──────────────────────────────────────────── */}
        <div className="vg-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
            <div>
              <p className="vg-eyebrow">Job detail</p>
              <h1 style={{ marginBottom: "4px" }}>{job.audio_file_name}</h1>
              <p className="vg-small vg-secondary">
                Duration: <span className="vg-mono">{fmt(job.audio_duration_seconds)}</span>
                {job.prompt_template_version && ` · Template v${job.prompt_template_version}`}
              </p>
            </div>
            <StatusBadge value={job.status} />
          </div>

          {/* Pipeline */}
          <PipelineTracker currentStage={job.current_stage} status={job.status} />

          {/* Progress bar */}
          <div style={{ marginTop: "20px" }}>
            <ProgressBar value={pct} animated={isActive} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
              <span className="vg-small vg-secondary">
                {liveProgress?.message || (job.scenes_total > 0 ? `${job.scenes_completed}/${job.scenes_total} scenes` : msg.body)}
              </span>
              <span className="vg-small vg-mono vg-secondary">{pct}%</span>
            </div>
          </div>

          {/* Status-specific CTA */}
          {job.status === "awaiting_approval" && (
            <div style={{ marginTop: "20px", padding: "16px 20px", borderRadius: "var(--radius-lg)", background: "var(--warning-dim)", border: "1px solid rgba(255,170,51,0.25)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <p style={{ fontWeight: 600, color: "var(--warning)" }}>✅ Storyboard ready for review</p>
                <p className="vg-small vg-secondary">Review all scenes before approving GPU spend.</p>
              </div>
              <Link href={`/job/${job.id}/review`} className="vg-btn">Review storyboard →</Link>
            </div>
          )}

          {job.status === "complete" && (
            <div style={{ marginTop: "20px", padding: "16px 20px", borderRadius: "var(--radius-lg)", background: "var(--teal-dim)", border: "1px solid rgba(0,217,184,0.25)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <p style={{ fontWeight: 600, color: "var(--teal)" }}>🎉 Video complete</p>
                <p className="vg-small vg-secondary">Your music video is ready.</p>
              </div>
              <div className="vg-actions">
                {job.final_video_url && (
                  <a href={job.final_video_url} className="vg-btn" download>⬇ Download MP4</a>
                )}
                <ActionLink href="/create" secondary>＋ New job</ActionLink>
              </div>
            </div>
          )}

          {job.status === "failed" && job.failure_reason && (
            <div className="vg-error-banner" style={{ marginTop: "20px" }}>
              <span>⚠</span>
              <span>{job.failure_reason}</span>
            </div>
          )}
        </div>

        {/* ── Video + Analysis ──────────────────────────────────────── */}
        <div className="vg-two-col">
          {/* Video */}
          <div className="vg-card">
            <p className="vg-eyebrow" style={{ marginBottom: "12px" }}>
              {job.final_video_url ? "Final video" : job.preview_video_url ? "Preview" : "Output"}
            </p>
            {job.final_video_url ? (
              <VideoPlayer src={job.final_video_url} downloadHref={job.final_video_url} />
            ) : job.preview_video_url ? (
              <>
                <VideoPlayer src={job.preview_video_url} />
                <p className="vg-small vg-secondary" style={{ marginTop: "10px" }}>
                  Partial preview — final video will replace this once assembly completes.
                </p>
              </>
            ) : (
              <VideoPlayer src={null} />
            )}
          </div>

          {/* Analysis + Cost */}
          <div className="vg-card">
            <p className="vg-eyebrow" style={{ marginBottom: "4px" }}>Audio analysis</p>
            <StatRow label="Mood" value={job.audio_analysis?.mood} />
            <StatRow label="BPM" value={job.audio_analysis?.bpm != null ? Math.round(job.audio_analysis.bpm) : null} mono />
            <StatRow label="Key" value={job.audio_analysis?.key} />
            <StatRow label="Genre" value={job.audio_analysis?.genre} />

            <div className="vg-divider" style={{ margin: "16px 0 12px" }} />
            <p className="vg-eyebrow" style={{ marginBottom: "4px" }}>Cost</p>
            <StatRow label="Estimated" value={fmtCost(job.estimated_cost_usd)} mono />
            <StatRow label="Actual" value={fmtCost(job.actual_cost_usd)} mono />
            <StatRow label="Cap" value={fmtCost(job.cost_cap_usd)} mono />

            <div className="vg-divider" style={{ margin: "16px 0 12px" }} />
            <p className="vg-eyebrow" style={{ marginBottom: "4px" }}>Storyboard</p>
            <StatRow label="Quality score" value={job.storyboard?.quality_score != null ? `${job.storyboard.quality_score}/10` : null} />
            <StatRow label="Scenes" value={job.scenes_total || null} />
            <StatRow label="Regenerations" value={job.storyboard_regeneration_count ?? 0} />
          </div>
        </div>

        {/* ── Scene timeline ────────────────────────────────────────── */}
        {scenes.length > 0 && (
          <div className="vg-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
              <p className="vg-eyebrow">Scene timeline</p>
              <span className="vg-small vg-secondary">{scenes.length} scenes</span>
            </div>
            {retryError && <ErrorBanner message={retryError} />}
            <div className="vg-scene-grid">
              {scenes.map((scene) => (
                <SceneCard
                  key={scene.id || scene.scene_index}
                  scene={scene}
                  showRetry={showRetry}
                  onRetry={handleRetry}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
