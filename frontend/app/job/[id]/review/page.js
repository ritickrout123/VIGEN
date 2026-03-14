"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { h } from "../../../../lib/h.js";
import { approveStoryboard, fetchJob, rejectStoryboard } from "../../../../lib/api.js";
import { getStoredSession } from "../../../../lib/auth.js";
import { Card, Shell, StatusBadge } from "../../../../components/ui.js";

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getStoredSession()) {
      router.push("/login");
      return;
    }
    fetchJob(params.id).then(setJob).catch((fetchError) => setError(fetchError.message));
  }, [params.id, router]);

  async function handleApprove() {
    await approveStoryboard(params.id);
    router.push(`/job/${params.id}`);
  }

  async function handleReject() {
    const nextJob = await rejectStoryboard(params.id, reason || "Storyboard needs another pass.");
    setJob(nextJob);
  }

  return h(
    Shell,
    null,
    h(
      "main",
      { className: "page-grid" },
      !job
        ? h(Card, null, h("p", { className: "muted" }, error || "Loading storyboard..."))
        : [
            h(
              Card,
              { key: "summary" },
              h("div", { className: "kicker" }, "Storyboard review"),
              h("div", { style: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" } },
                h("div", null,
                  h("h1", null, job.audio_file_name),
                  h("p", { className: "muted" }, job.storyboard?.narrative_arc || "Narrative arc pending")
                ),
                h(StatusBadge, { value: job.status })
              ),
              h("p", { className: "small muted" }, `Estimated cost before render: $${job.estimated_cost_usd ?? "0.00"}`),
              h("div", { className: "actions" },
                h("button", { className: "btn", type: "button", onClick: handleApprove }, "Approve and render"),
                h("button", { className: "btn-secondary", type: "button", onClick: handleReject }, "Reject and regenerate")
              ),
              h("label", { className: "field" },
                h("span", null, "Rejection reason"),
                h("textarea", {
                  value: reason,
                  onChange: (event) => setReason(event.target.value),
                  placeholder: "Tell the planner what to improve."
                })
              )
            ),
            h(
              "section",
              { key: "scenes", className: "scene-grid" },
              ...(job.scenes || []).map((scene) =>
                h(
                  Card,
                  { key: scene.id || scene.scene_index },
                  h("div", { className: "kicker" }, `Scene ${scene.scene_index + 1}`),
                  h("p", { className: "small muted" }, `${scene.start_time_seconds}s - ${scene.end_time_seconds}s`),
                  h("p", null, scene.visual_prompt),
                  h("p", { className: "small muted" }, `Mood: ${scene.mood} • Camera: ${scene.camera_angle}`)
                )
              )
            )
          ]
    )
  );
}
