"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { h } from "../../lib/h.js";
import { fetchJobs } from "../../lib/api.js";
import { getStoredSession } from "../../lib/auth.js";
import { Card, EmptyState, ProgressBar, Shell, StatusBadge } from "../../components/ui.js";

export default function DashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getStoredSession()) {
      router.push("/login");
      return;
    }
    fetchJobs()
      .then(setJobs)
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, [router]);

  return h(
    Shell,
    null,
    h(
      "main",
      { className: "page-grid" },
      h(
        Card,
        null,
        h("div", { className: "kicker" }, "Dashboard"),
        h("h1", null, "Your render jobs"),
        h("p", { className: "lede" }, "Monitor every stage from analysis to assembly, then jump back into completed jobs for review or download.")
      ),
      loading
        ? h(Card, null, h("p", { className: "muted" }, "Loading jobs..."))
        : error
          ? h(Card, null, h("p", { style: { color: "#b91c1c" } }, error))
          : jobs.length === 0
            ? h(EmptyState, { title: "No jobs yet", body: "Create your first upload to populate the dashboard." })
            : h("div", { className: "list" },
                ...jobs.map((job) =>
                  h(
                    "article",
                    { className: "job-card", key: job.id },
                    h("div", { style: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" } },
                      h("div", null,
                        h("strong", null, job.audio_file_name),
                        h("p", { className: "small muted" }, `Job ${job.id}`)
                      ),
                      h(StatusBadge, { value: job.status })
                    ),
                    h(ProgressBar, {
                      value: job.scenes_total ? (job.scenes_completed / job.scenes_total) * 100 : 0
                    }),
                    h("div", { style: { display: "flex", justifyContent: "space-between", gap: "12px" } },
                      h("span", { className: "small muted" }, `${job.scenes_completed}/${job.scenes_total} scenes complete`),
                      h(Link, { href: `/job/${job.id}`, className: "btn-secondary" }, "Open job")
                    )
                  )
                ))
    )
  );
}

