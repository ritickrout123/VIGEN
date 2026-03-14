"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchJobs } from "../../lib/api.js";
import { getStoredSession } from "../../lib/auth.js";
import { ActionLink, Card, EmptyState, ProgressBar, Shell, StatusBadge } from "../../components/ui.jsx";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <Shell>
      <main className="page-grid">
        {/* Header + CTA */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <div className="kicker">Dashboard</div>
            <h1>Your render jobs</h1>
          </div>
          <ActionLink href="/create">＋ New job</ActionLink>
        </div>

        {/* Body */}
        {loading ? (
          <Card><p className="muted">Loading jobs…</p></Card>
        ) : error ? (
          <Card><p className="error-text">{error}</p></Card>
        ) : jobs.length === 0 ? (
          <EmptyState
            title="No jobs yet"
            body="Upload a track to start generating your first music video."
            icon="🎬"
            action={<ActionLink href="/create">Create a job</ActionLink>}
          />
        ) : (
          <div className="list">
            {jobs.map((job) => {
              const pct = job.scenes_total
                ? Math.round((job.scenes_completed / job.scenes_total) * 100)
                : 0;

              return (
                <article key={job.id} className="job-card">
                  {/* Colour accent strip */}
                  <div className="job-thumb" />

                  {/* Header row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                    <div>
                      <strong style={{ fontSize: "1rem" }}>{job.audio_file_name}</strong>
                      <p className="small muted" style={{ margin: "2px 0 0" }}>
                        Created {formatDate(job.created_at)}
                      </p>
                    </div>
                    <StatusBadge value={job.status} />
                  </div>

                  {/* Progress */}
                  <ProgressBar value={pct} />
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                    <span className="small muted">
                      {job.scenes_total
                        ? `${job.scenes_completed}/${job.scenes_total} scenes · ${pct}%`
                        : job.status}
                    </span>
                    {job.estimated_cost_usd != null && (
                      <span className="small muted">~${Number(job.estimated_cost_usd).toFixed(2)}</span>
                    )}
                  </div>

                  {/* Failure reason */}
                  {job.failure_reason && (
                    <p className="small error-text">{job.failure_reason}</p>
                  )}

                  {/* Actions */}
                  <div className="actions">
                    <Link href={`/job/${job.id}`} className="btn-secondary">Open job →</Link>
                    {job.status === "awaiting_approval" && (
                      <Link href={`/job/${job.id}/review`} className="btn">✅ Review storyboard</Link>
                    )}
                    {job.status === "complete" && job.final_video_url && (
                      <a href={job.final_video_url} className="btn-ghost" download>⬇ Download</a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </Shell>
  );
}
