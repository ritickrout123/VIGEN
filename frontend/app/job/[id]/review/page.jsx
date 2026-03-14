"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { approveStoryboard, fetchJob, rejectStoryboard } from "../../../../lib/api.js";
import { getStoredSession } from "../../../../lib/auth.js";
import { ActionLink, ErrorBanner, SceneCard, Skeleton, StatusBadge, Tag } from "../../../../components/ui.jsx";

function fmt(s) {
  if (s == null) return "-";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!getStoredSession()) { router.push("/login"); return; }
    fetchJob(params.id)
      .then((data) => { setJob(data); setError(""); })
      .catch((err) => setError(err.message || "Failed to load storyboard."))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  async function handleApprove() {
    setApproving(true);
    setActionError("");
    try {
      await approveStoryboard(params.id);
      router.push(`/job/${params.id}`);
    } catch (err) {
      setActionError(err.message || "Approval failed.");
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) { setActionError("Please describe what should change."); return; }
    setRejecting(true);
    setActionError("");
    try {
      const updated = await rejectStoryboard(params.id, reason);
      setJob(updated);
      setReason("");
      setShowReject(false);
    } catch (err) {
      setActionError(err.message || "Rejection failed.");
    } finally {
      setRejecting(false);
    }
  }

  if (loading) {
    return (
      <div className="vg-shell">
        <main className="vg-page">
          <div className="vg-card" style={{ display: "grid", gap: "20px" }}>
            <Skeleton height={28} width="45%" />
            <Skeleton height={16} width="70%" />
            <Skeleton height={80} />
          </div>
          <div className="vg-scene-grid">
            {[1,2,3,4,5,6].map((i) => <Skeleton key={i} height={200} />)}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vg-shell">
        <main className="vg-page">
          <ErrorBanner message={error} />
          <ActionLink href="/dashboard" secondary>Back to dashboard</ActionLink>
        </main>
      </div>
    );
  }

  const sb = job?.storyboard;
  const scenes = job?.scenes || [];

  return (
    <div className="vg-shell">
      <main className="vg-page">

        <div className="vg-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
            <div style={{ flex: 1 }}>
              <p className="vg-eyebrow">Storyboard review</p>
              <h1 style={{ marginBottom: "8px" }}>{job?.audio_file_name || "..."}</h1>
              {sb?.narrative_arc && (
                <p className="vg-lede" style={{ maxWidth: "680px" }}>{sb.narrative_arc}</p>
              )}
            </div>
            <StatusBadge value={job?.status} />
          </div>

          {sb && (
            <div className="vg-tag-row" style={{ marginBottom: "20px" }}>
              {sb.dominant_mood && <Tag>Mood: {sb.dominant_mood}</Tag>}
              {sb.quality_score != null && <Tag>Quality {sb.quality_score}/10</Tag>}
              {sb.total_duration_seconds != null && <Tag>{fmt(sb.total_duration_seconds)}</Tag>}
              <Tag>{scenes.length} scenes</Tag>
              {job?.audio_analysis?.bpm != null && (
                <Tag>{Math.round(job.audio_analysis.bpm)} BPM</Tag>
              )}
              {job?.audio_analysis?.key && <Tag>{job.audio_analysis.key}</Tag>}
              {job?.audio_analysis?.genre && <Tag>{job.audio_analysis.genre}</Tag>}
            </div>
          )}

          <div className="vg-cost-box" style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <p className="vg-label" style={{ color: "var(--warning)", marginBottom: "4px" }}>Estimated render cost</p>
                <p style={{ fontSize: "2rem", fontWeight: 700, color: "var(--ink)", fontFamily: "monospace" }}>
                  ${Number(job?.estimated_cost_usd ?? 0).toFixed(2)}
                </p>
                <p className="vg-small vg-secondary" style={{ marginTop: "4px" }}>
                  Charged from your credit balance only after you approve. No GPU spend until you click Approve.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
                {job?.cost_cap_usd != null && (
                  <span className="vg-small vg-secondary">
                    Cap: <span style={{ fontFamily: "monospace" }}>${Number(job.cost_cap_usd).toFixed(2)}</span>
                  </span>
                )}
                {job?.storyboard_regeneration_count > 0 && (
                  <span className="vg-small vg-secondary">Regeneration #{job.storyboard_regeneration_count}</span>
                )}
              </div>
            </div>
          </div>

          <div className="vg-actions">
            <button className="vg-btn vg-btn-lg" type="button" disabled={approving} onClick={handleApprove}>
              {approving ? "Starting render..." : "Approve and render"}
            </button>
            <button
              className="vg-btn-danger"
              type="button"
              onClick={() => { setShowReject(!showReject); setActionError(""); }}
            >
              {showReject ? "Cancel" : "Reject and regenerate"}
            </button>
            <ActionLink href={`/job/${params.id}`} secondary>Back to job</ActionLink>
          </div>

          {showReject && (
            <div style={{ marginTop: "20px", padding: "20px", borderRadius: "var(--radius-lg)", background: "var(--bg-elevated)", border: "1px solid var(--border)", display: "grid", gap: "12px" }}>
              <p style={{ fontWeight: 600, color: "var(--ink)" }}>What should the AI change?</p>
              <div className="vg-field">
                <textarea
                  placeholder="e.g. Make scenes 3-5 more dramatic. Use cooler color tones. Slow down the pacing in the second half."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  autoFocus
                  rows={4}
                />
              </div>
              <button className="vg-btn-secondary" disabled={rejecting} onClick={handleReject}>
                {rejecting ? "Regenerating..." : "Send feedback and regenerate"}
              </button>
            </div>
          )}

          {actionError && (
            <div style={{ marginTop: "12px" }}>
              <ErrorBanner message={actionError} />
            </div>
          )}
        </div>

        {scenes.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2>{scenes.length} scenes</h2>
              <span className="vg-small vg-secondary">
                Total: <span style={{ fontFamily: "monospace" }}>{fmt(sb?.total_duration_seconds)}</span>
              </span>
            </div>
            <div className="vg-scene-grid">
              {scenes.map((scene, i) => {
                const sbScene = sb?.scenes?.[i] || {};
                const merged = {
                  ...scene,
                  visual_prompt: scene.visual_prompt || sbScene.visual_description,
                  color_palette: scene.color_palette || sbScene.color_palette || [],
                  motion_type: scene.motion_type || sbScene.motion_type,
                  lighting_style: scene.lighting_style || sbScene.lighting_style,
                  mood: scene.mood || sbScene.mood,
                  camera_angle: scene.camera_angle || sbScene.camera_angle,
                  beat_importance_score: scene.beat_importance_score ?? sbScene.beat_importance_score,
                  duration_seconds: scene.duration_seconds || sbScene.duration_seconds,
                };
                return (
                  <SceneCard
                    key={scene.id || scene.scene_index}
                    scene={merged}
                    showRetry={false}
                  />
                );
              })}
            </div>
          </div>
        )}

        {scenes.length > 3 && (
          <div className="vg-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <p style={{ fontWeight: 600, color: "var(--ink)" }}>Ready to render?</p>
              <p className="vg-small vg-secondary">
                Estimated cost: <span style={{ fontFamily: "monospace" }}>${Number(job?.estimated_cost_usd ?? 0).toFixed(2)}</span>
              </p>
            </div>
            <button className="vg-btn vg-btn-lg" type="button" disabled={approving} onClick={handleApprove}>
              {approving ? "Starting render..." : "Approve and render"}
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
