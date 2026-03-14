"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchPresets, uploadAudio, createJob } from "../../lib/api.js";
import { getStoredSession } from "../../lib/auth.js";
import { Shell, DragUploader, PresetCard, ActionLink, ErrorBanner } from "../../components/ui.jsx";

export default function CreatePage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const s = getStoredSession();
    if (!s) {
      router.push("/login");
      return;
    }
    setSession(s);

    fetchPresets()
      .then((data) => {
        setPresets(data);
        if (data.length > 0) setSelectedPresetId(data[0].id);
      })
      .catch((err) => setError("Failed to load style presets. Check if mock mode is on if backend is down."));
  }, [router]);

  async function handleStartGeneration() {
    if (!file) {
      setError("Please upload an audio track first.");
      return;
    }
    if (!selectedPresetId) {
      setError("Please select a style preset.");
      return;
    }

    setError("");
    setCreating(true);
    setUploading(true);

    try {
      // 1. Upload audio
      const audioData = await uploadAudio(file);
      setUploading(false);

      // 2. Create job
      const job = await createJob({
        style_preset_id: selectedPresetId,
        audio_url: audioData.audio_url,
        audio_file_name: audioData.audio_file_name,
        audio_duration_seconds: audioData.detected_duration_seconds,
        audio_file_size_bytes: audioData.file_size_bytes,
      });

      // 3. Redirect to job status
      router.push(`/job/${job.id}`);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setUploading(false);
      setCreating(false);
    }
  }

  if (!session) return null;

  return (
    <div className="vg-shell">
      <main className="vg-page" style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div>
          <p className="vg-eyebrow">Create</p>
          <h1>Generate a new music video</h1>
          <p className="vg-lede" style={{ marginTop: "8px" }}>
            Upload your track and choose a cinematic style. Our AI will analyze the beats, 
            structure, and mood to craft a beat-synchronized storyboard.
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: "24px" }}>
            <ErrorBanner message={error} />
          </div>
        )}

        <div style={{ display: "grid", gap: "32px" }}>
          {/* Section 1: Audio Upload */}
          <section>
            <h2 style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ opacity: 0.3, fontSize: "0.8em" }}>01</span> Upload Audio
            </h2>
            <DragUploader 
              file={file} 
              onFile={setFile} 
              uploading={uploading} 
            />
          </section>

          {/* Section 2: Style Presets */}
          <section>
            <h2 style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ opacity: 0.3, fontSize: "0.8em" }}>02</span> Choose Style
            </h2>
            <div className="vg-preset-grid">
              {presets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  selected={selectedPresetId === preset.id}
                  onSelect={setSelectedPresetId}
                />
              ))}
              {presets.length === 0 && !error && (
                <p className="vg-secondary vg-small">Loading presets...</p>
              )}
            </div>
          </section>

          {/* Action Footer */}
          <footer style={{ 
            marginTop: "16px", 
            paddingTop: "32px", 
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "20px"
          }}>
            <ActionLink href="/dashboard" secondary>Cancel</ActionLink>
            <button 
              className="vg-btn vg-btn-lg" 
              onClick={handleStartGeneration}
              disabled={creating || !file}
              style={{ minWidth: "200px" }}
            >
              {creating ? (uploading ? "Uploading..." : "Creating...") : "Start Generation →"}
            </button>
          </footer>
        </div>
      </main>
    </div>
  );
}
