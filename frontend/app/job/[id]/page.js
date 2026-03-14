"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { h } from "../../../lib/h.js";
import { fetchJob, retryScene } from "../../../lib/api.js";
import { getStoredSession } from "../../../lib/auth.js";
import { Card, ProgressBar, Shell, StatusBadge } from "../../../components/ui.js";

function sceneProgress(job) {
  if (!job?.scenes_total) {
    return 0;
  }
  return Math.round((job.scenes_completed / job.scenes_total) * 100);
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getStoredSession()) {
      router.push("/login");
      return;
    }
    let active = true;

    async function loadJob() {
      try {
        const nextJob = await fetchJob(params.id);
        if (active) {
          setJob(nextJob);
          setError("");
        }
      } catch (fetchError) {
        if (active) {
          setError(fetchError.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadJob();
    const interval = window.setInterval(loadJob, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [params.id, router]);

  const completionPercent = useMemo(() => sceneProgress(job), [job]);

  async function handleRetry(sceneIndex) {
    if (!job) {
      return;
    }
    const refreshed = await retryScene(job.id, sceneIndex, "Manual regeneration from job detail page");
    setJob(refreshed);
  }

  return h(
    Shell,
    null,
    h(
      "main",
      { className: "page-grid" },
      loading
        ? h(Card, null, h("p", { className: "muted" }, "Loading job..."))
        : error
          ? h(Card, null, h("p", { style: { color: "#b91c1c" } }, error))
          : job
            ? [
                h(
                  Card,
                  { key: "summary" },
                  h("div", { className: "kicker" }, "Job detail"),
                  h("div", { style: { display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center" } },
                    h("div", null,
                      h("h1", null, job.audio_file_name),
                      h("p", { className: "muted" }, `Duration ${job.audio_duration_seconds}s`)
                    ),
                    h(StatusBadge, { value: job.status })
                  ),
                  h(ProgressBar, { value: completionPercent }),
                  h("p", { className: "small muted" }, `${job.scenes_completed}/${job.scenes_total} scenes complete`),
                  job.status === "awaiting_approval"
                    ? h(Link, { href: `/job/${job.id}/review`, className: "btn" }, "Review storyboard")
                    : null
                ),
                h(
                  "div",
                  { key: "grid", className: "two-column" },
                  h(
                    Card,
                    null,
                    h("div", { className: "kicker" }, "Output"),
                    job.preview_video_url
                      ? h("p", { className: "small" }, `Preview ready at ${job.preview_video_url}`)
                      : h("p", { className: "small muted" }, "Preview will appear once the first batch of scenes is rendered."),
                    job.final_video_url
                      ? h("a", { className: "btn", href: job.final_video_url, target: "_blank", rel: "noreferrer" }, "Download final video")
                      : h("p", { className: "small muted" }, "Final output is not ready yet.")
                  ),
                  h(
                    Card,
                    null,
                    h("div", { className: "kicker" }, "Audio analysis"),
                    h("p", null, `Mood: ${job.audio_analysis?.mood || "unknown"}`),
                    h("p", null, `BPM: ${job.audio_analysis?.bpm || 0}`),
                    h("p", { className: "small muted" }, `Estimated cost: $${job.estimated_cost_usd ?? "0.00"}`)
                  )
                ),
                h(
                  Card,
                  { key: "timeline" },
                  h("div", { className: "kicker" }, "Scene timeline"),
                  h(
                    "div",
                    { className: "timeline" },
                    ...(job.scenes || []).map((scene) =>
                      h(
                        "article",
                        { className: "job-card", key: scene.id || scene.scene_index },
                        h("strong", null, `Scene ${scene.scene_index + 1}`),
                        h("p", { className: "small muted" }, `${scene.start_time_seconds}s - ${scene.end_time_seconds}s`),
                        h("p", { className: "small" }, scene.visual_prompt),
                        h(StatusBadge, { value: scene.status }),
                        h("button", { className: "btn-secondary", type: "button", onClick: () => handleRetry(scene.scene_index) }, "Retry scene")
                      )
                    )
                  )
                )
              ]
            : null
    )
  );
}

