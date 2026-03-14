"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { fetchJob, retryScene, subscribeToJobProgress } from "../../../lib/api.js";
import { getStoredSession } from "../../../lib/auth.js";
import {
  Card, PipelineTracker, ProgressBar, SceneCard,
  Shell, StatRow, StatusBadge, VideoPlayer
} from "../../../components/ui.jsx";

function formatDuration(seconds) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatCost(val) {
  return val != null ? `$${Number(val).toFixed(2)}` : "—";
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [liveProgress, setLiveProgress] = useState(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (!getStoredSession()) { router.push("/login"); return; }

    async function loadJob() {
      try {
        const data = await fetchJob(params.id);
        setJob(data);
        setError("");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadJob();
  }, [params.id, router]);

  useEffect(() => {
    if (!job) return;
    const progressible = ["rendering", "assembling", "awaiting_approval"].includes(job.status);
    if (!progressible) return;

    cleanupRef.current?.();

    const cleanup = subscribeToJobProgress(
      job.id,
      (event) => {
        setLiveProgress(event);
        setJob((prev) => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (event.scenes_complete != null) updated.scenes_completed = event.scenes_complete;
          if (event.stage === "done") { updated.status = "complete"; updated.current_stage = "done"; }
          if (event.stage === "assembling") { updated.status = "assembling"; updated.current_stage = "assembly"; }
          return updated;
        });
      },
      () => {
        fetchJob(params.id).then(setJob).catch(() => {});
      }
    );

    cleanupRef.current = cleanup;
    return () => cleanup();
  }, [job?.id, job?.status, params.id]);

  async function handleRetry(sceneIndex) {
    if (!job) return;
    try {
      const refreshed = await retryScene(job.id, sceneIndex, "Manual regeneration");
      setJob(refreshed);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return (
    <Shell>
      <main className="page-grid">
        <Card><p className="muted">Loading job…</p></Card>
      </main>
    </Shell>
  );
  if (error) return (
    <Shell>
      <main className="page-grid">
        <Card><p className="error-text">{error}</p></Card>
      </main>
    </Shell>
  );
  if (!job) return null;

  const pct = job.scenes_total
    ? Math.round((job.scenes_completed / job.scenes_total) * 100)
    : (liveProgress?.percent ?? 0);

  const activeScenes = job.scenes || [];
  const showRetry = ["rendering", "complete", "failed"].includes(job.status);

  return (
    <Shell>
      <main className="page-grid">
        {/* ── Pipeline Tracker ───────────────────────────────────── */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
            <div>
              <div className="kicker">Job detail</div>
              <h1 style={{ margin: "4px 0 2px" }}>{job.audio_file_name}</h1>
              <p className="small muted">Duration: {formatDuration(job.audio_duration_seconds)}</p>
            </div>
            <StatusBadge value={job.status} />
          </div>
          <PipelineTracker currentStage={job.current_stage} status={job.status} />
          <div style={{ marginTop: "16px" }}>
            <ProgressBar value={pct} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
              <span className="small muted">
                {liveProgress?.message || `${job.scenes_completed}/${job.scenes_total} scenes`}
              </span>
              <span className="small muted">{pct}%</span>
            </div>
          </div>
          {job.status === "awaiting_approval" && (
            <div style={{ marginTop: "16px" }}>
              <Link href={`/job/${job.id}/review`} className="btn">✅ Review storyboard →</Link>
            </div>
          )}
          {job.failure_reason && (
            <p className="error-text" style={{ marginTop: "12px" }}>⚠ {job.failure_reason}</p>
          )}
        </Card>

        {/* ── Output + Analysis ──────────────────────────────────── */}
        <div className="two-column">
          {/* Output */}
          <Card>
            <div className="kicker">Output</div>
            {job.final_video_url ? (
              <VideoPlayer src={job.final_video_url} downloadHref={job.final_video_url} />
            ) : job.preview_video_url ? (
              <div>
                <div className="kicker" style={{ marginBottom: "8px", color: "var(--yellow)" }}>Preview ready</div>
                <VideoPlayer src={job.preview_video_url} />
                <p className="small muted" style={{ marginTop: "8px" }}>Final video will replace this once assembly completes.</p>
              </div>
            ) : (
              <VideoPlayer src={null} />
            )}
          </Card>

          {/* Analysis stats */}
          <Card>
            <div className="kicker">Audio analysis</div>
            <StatRow label="Mood" value={job.audio_analysis?.mood} />
            <StatRow label="BPM" value={job.audio_analysis?.bpm} />
            <StatRow label="Key" value={job.audio_analysis?.key} />
            <StatRow label="Genre" value={job.audio_analysis?.genre} />
            <div className="divider" style={{ margin: "0" }} />
            <div className="kicker" style={{ marginTop: "16px" }}>Cost</div>
            <StatRow label="Estimated" value={formatCost(job.estimated_cost_usd)} />
            <StatRow label="Actual" value={formatCost(job.actual_cost_usd)} />
            <StatRow label="Cap" value={formatCost(job.cost_cap_usd)} />
            <div className="divider" style={{ margin: "0" }} />
            <div className="kicker" style={{ marginTop: "16px" }}>Storyboard</div>
            <StatRow label="Quality score" value={job.storyboard?.quality_score != null ? `${job.storyboard.quality_score}/10` : "—"} />
            <StatRow label="Scenes" value={job.scenes_total ?? "—"} />
            <StatRow label="Regenerations" value={job.storyboard_regeneration_count ?? 0} />
          </Card>
        </div>

        {/* ── Scene Timeline ─────────────────────────────────────── */}
        {activeScenes.length > 0 && (
          <Card>
            <div className="kicker">Scene timeline</div>
            <p className="small muted" style={{ marginBottom: "14px" }}>
              {activeScenes.length} scenes · click a failed scene to retry
            </p>
            <div className="timeline">
              {activeScenes.map((scene) => (
                <SceneCard
                  key={scene.id || scene.scene_index}
                  scene={scene}
                  showRetry={showRetry}
                  onRetry={handleRetry}
                />
              ))}
            </div>
          </Card>
        )}
      </main>
    </Shell>
  );
}
