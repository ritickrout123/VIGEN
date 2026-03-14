"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { approveStoryboard, fetchJob, rejectStoryboard } from "../../../../lib/api.js";
import { getStoredSession } from "../../../../lib/auth.js";
import { Badge, Card, SceneCard, Shell, StatusBadge } from "../../../../components/ui.jsx";

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getStoredSession()) { router.push("/login"); return; }
    fetchJob(params.id)
      .then(setJob)
      .catch((err) => setError(err.message));
  }, [params.id, router]);

  async function handleApprove() {
    setApproving(true);
    setError("");
    try {
      await approveStoryboard(params.id);
      router.push(`/job/${params.id}`);
    } catch (err) {
      setError(err.message);
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) { setError("Please describe what should change."); return; }
    setRejecting(true);
    setError("");
    try {
      const updated = await rejectStoryboard(params.id, reason);
      setJob(updated);
      setReason("");
      setShowReject(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setRejecting(false);
    }
  }

  if (!job && !error) {
    return (
      <Shell>
        <main className="page-grid">
          <Card><p className="muted">Loading storyboard…</p></Card>
        </main>
      </Shell>
    );
  }

  const sb = job?.storyboard;
  const scenes = job?.scenes || [];

  return (
    <Shell>
      <main className="page-grid">
        {/* ── Header ──────────────────────────────────────────────── */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <div className="kicker">Storyboard review</div>
              <h1 style={{ margin: "6px 0 4px" }}>{job?.audio_file_name || "…"}</h1>
              {sb?.narrative_arc && (
                <p className="lede" style={{ maxWidth: "640px" }}>{sb.narrative_arc}</p>
              )}
            </div>
            <StatusBadge value={job?.status} />
          </div>

          {sb && (
            <div className="badge-row" style={{ marginTop: "12px" }}>
              {sb.dominant_mood && <Badge>🎭 {sb.dominant_mood}</Badge>}
              {sb.quality_score && <Badge>⭐ Quality {sb.quality_score}/10</Badge>}
              {sb.total_duration_seconds && <Badge>⏱ {sb.total_duration_seconds}s</Badge>}
              <Badge>📐 {scenes.length} scenes</Badge>
            </div>
          )}

          {/* Cost estimate */}
          <div style={{ marginTop: "16px", padding: "14px 18px", borderRadius: "var(--radius-md)", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
            <span className="label" style={{ color: "var(--accent)" }}>Estimated render cost</span>
            <p style={{ margin: "4px 0 0", fontSize: "1.6rem", fontWeight: 800 }}>
              ${Number(job?.estimated_cost_usd ?? 0).toFixed(2)}
            </p>
            <p className="small muted" style={{ margin: "2px 0 0" }}>
              Charged from your credit balance only after you approve. No GPU spend until you click Approve.
            </p>
          </div>

          {/* CTA */}
          <div className="actions" style={{ marginTop: "20px" }}>
            <button className="btn" type="button" disabled={approving} onClick={handleApprove}>
              {approving ? "Starting render…" : "✅ Approve and render"}
            </button>
            <button
              className="btn-danger"
              type="button"
              onClick={() => { setShowReject(!showReject); setError(""); }}
            >
              {showReject ? "Cancel" : "↺ Reject and regenerate"}
            </button>
          </div>

          {/* Reject textarea */}
          {showReject ? (
            <div style={{ marginTop: "16px", display: "grid", gap: "10px" }}>
              <label className="field">
                <span className="label">What should the planner change?</span>
                <textarea
                  placeholder="e.g. Make scenes 3-5 more dramatic. Use cooler color tones throughout. Slow down the pacing."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  autoFocus
                />
              </label>
              {error && <p className="error-text">{error}</p>}
              <button className="btn-secondary" disabled={rejecting} onClick={handleReject}>
                {rejecting ? "Regenerating…" : "Send feedback and regenerate"}
              </button>
            </div>
          ) : error && (
            <p className="error-text" style={{ marginTop: "12px" }}>{error}</p>
          )}

          {job?.storyboard_regeneration_count > 0 && (
            <p className="small muted" style={{ marginTop: "12px" }}>
              Regeneration attempt {job.storyboard_regeneration_count}
            </p>
          )}
        </Card>

        {/* ── Scene Grid ──────────────────────────────────────────── */}
        {scenes.length > 0 && (
          <div>
            <h2 style={{ marginBottom: "14px" }}>{scenes.length} scenes</h2>
            <div className="scene-grid">
              {scenes.map((scene, i) => {
                const sbScene = sb?.scenes?.[i] || {};
                const merged = {
                  ...scene,
                  visual_prompt: scene.visual_prompt || sbScene.visual_description,
                  color_palette: scene.color_palette || sbScene.color_palette || []
                };
                return <SceneCard key={scene.id || scene.scene_index} scene={merged} showRetry={false} />;
              })}
            </div>
          </div>
        )}
      </main>
    </Shell>
  );
}
