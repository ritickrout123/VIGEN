"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJobs } from "../../lib/api.js";
import { getStoredSession } from "../../lib/auth.js";
import { ActionLink, EmptyState, ErrorBanner, ProgressBar, Skeleton, StatusBadge } from "../../components/ui.jsx";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDuration(s) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `0:${String(sec).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getStoredSession()) { router.push("/login"); return; }
    fetchJobs()
      .then(setJobs)
      .catch((err) => setError(err.message || "Failed to load jobs."))
      .finally(() => setLoading(false));
  }, [router]);

  function retry() {
    setError("");
    setLoading(true);
    fetchJobs()
      .then(setJobs)
      .catch((err) => setError(err.message || "Failed to load jobs."))
      .finally(() => setLoading(false));
  }

  return (
    <div className="vg-shell">
      <main className="vg-page">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <p className="vg-eyebrow">Dashboard</p>
            <h1>Your render jobs</h1>
          </div>
          <ActionLink href="/create">＋ New job</ActionLink>
        </div>

        {/* Body */}
        {loading ? (
          <div className="vg-list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="vg-card" style={{ display: "grid", gap: "14px" }}>
                <Skeleton height={18} width="40%" />
                <Skeleton height={14} width="25%" />
                <Skeleton height={6} />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorBanner message={error} onRetry={retry} />
        ) : jobs.length === 0 ? (
          <EmptyState
            title="No jobs yet"
            body="Upload a track to start generating your first music video."
            icon="🎬"
            action={<ActionLink href="/create">Create a job</ActionLink>}
          />
        ) : (
          <div className="vg-list">
            {jobs.map((job) => {
              const pct = job.scenes_total
                ? Math.round((job.scenes_completed / job.scenes_total) * 100)
                : 0;
              const isActive = ["analysing", "planning", "rendering", "assembling"].includes(job.status);

              return (
                <article key={job.id} className="vg-job-card">
                  {/* Accent bar */}
                  <div style={{ height: "3px", borderRadius: "2px", background: "linear-gradient(90deg, var(--purple), var(--teal))", marginBottom: "2px" }} />

                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                    <div>
                      <strong style={{ fontSize: "1rem", color: "var(--ink)" }}>{job.audio_file_name}</strong>
                      <p className="vg-small vg-secondary" style={{ marginTop: "2px" }}>
                        {formatDate(job.created_at)}
                        {job.audio_duration_seconds ? ` · ${formatDuration(job.audio_duration_seconds)}` : ""}
                      </p>
                    </div>
                    <StatusBadge value={job.status} />
                  </div>

                  {/* Progress (only when relevant) */}
                  {job.scenes_total > 0 && (
                    <div>
                      <ProgressBar value={pct} animated={isActive} />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                        <span className="vg-small vg-secondary">
                          {job.scenes_completed}/{job.scenes_total} scenes · {pct}%
                        </span>
                        {job.estimated_cost_usd != null && (
                          <span className="vg-small vg-mono vg-secondary">
                            ~${Number(job.estimated_cost_usd).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Failure reason */}
                  {job.failure_reason && (
                    <p className="vg-small vg-error">⚠ {job.failure_reason}</p>
                  )}

                  {/* Actions */}
                  <div className="vg-actions">
                    <Link href={`/job/${job.id}`} className="vg-btn-secondary">Open →</Link>
                    {job.status === "awaiting_approval" && (
                      <Link href={`/job/${job.id}/review`} className="vg-btn">✅ Review storyboard</Link>
                    )}
                    {job.status === "complete" && job.final_video_url && (
                      <a href={job.final_video_url} className="vg-btn-secondary" download>⬇ Download</a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
