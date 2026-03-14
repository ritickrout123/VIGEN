"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { h } from "../../lib/h.js";
import { createJob, fetchPresets, uploadAudio } from "../../lib/api.js";
import { getStoredSession } from "../../lib/auth.js";
import { Card, Shell } from "../../components/ui.js";

export default function CreatePage() {
  const router = useRouter();
  const [presets, setPresets] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getStoredSession()) {
      router.push("/login");
      return;
    }
    fetchPresets().then(setPresets).catch((fetchError) => setError(fetchError.message));
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedFile) {
      setError("Choose an audio file first.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const upload = await uploadAudio(selectedFile);
      const job = await createJob({
        audio_file_name: upload.audio_file_name,
        audio_url: upload.audio_url,
        audio_duration_seconds: upload.detected_duration_seconds,
        style_preset_id: selectedPreset || null,
        user_notes: notes || null
      });
      router.push(`/job/${job.id}`);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setUploading(false);
    }
  }

  return h(
    Shell,
    null,
    h(
      "main",
      { className: "page-grid two-column" },
      h(
        Card,
        null,
        h("div", { className: "kicker" }, "New job"),
        h("h1", null, "Upload a track"),
        h(
          "p",
          { className: "lede" },
          "Phase 1 keeps the path simple: upload audio, pick a preset, let the system analyze the track, then approve the storyboard before rendering starts."
        ),
        h("div", { className: "stats-grid" },
          h(Card, { className: "section-card" }, h("strong", null, "200 MB"), h("p", { className: "small muted" }, "Maximum file size")),
          h(Card, { className: "section-card" }, h("strong", null, "Approval gate"), h("p", { className: "small muted" }, "No GPU spend before review")),
          h(Card, { className: "section-card" }, h("strong", null, "Preview"), h("p", { className: "small muted" }, "Generated after early scene batch"))
        )
      ),
      h(
        Card,
        null,
        h("form", { className: "form-grid", onSubmit: handleSubmit },
          h("label", { className: "field" },
            h("span", null, "Audio file"),
            h("input", {
              type: "file",
              accept: ".mp3,.wav,.flac",
              onChange: (event) => setSelectedFile(event.target.files?.[0] ?? null)
            })
          ),
          h("label", { className: "field" },
            h("span", null, "Style preset"),
            h("select", {
              value: selectedPreset,
              onChange: (event) => setSelectedPreset(event.target.value)
            },
              h("option", { value: "" }, "Choose a preset"),
              ...presets.map((preset) =>
                h("option", { value: preset.id, key: preset.id }, preset.name)
              )
            )
          ),
          h("label", { className: "field" },
            h("span", null, "Creative notes"),
            h("textarea", {
              placeholder: "Describe any mood, references, or pacing preferences.",
              value: notes,
              onChange: (event) => setNotes(event.target.value)
            })
          ),
          error ? h("p", { style: { color: "#b91c1c" } }, error) : null,
          h("button", { className: "btn", type: "submit", disabled: uploading }, uploading ? "Uploading..." : "Create job")
        )
      )
    )
  );
}

