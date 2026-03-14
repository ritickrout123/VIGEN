"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchPresets, uploadAudio, createJob } from "../../lib/api.js";
import { getStoredSession } from "../../lib/auth.js";
import { ActionLink, DragUploader, ErrorBanner, PresetCard, Skeleton } from "../../components/ui.jsx";

export default function CreatePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getStoredSession()) { router.push("/login"); return; }
    setReady(true);
    fetchPresets()
      .then((data) => {
        setPresets(data);
        if (data.length > 0) setSelectedPresetId(data[0].id);
      })
      .catch(() => setError("Failed to load style presets."));
  }, [router]);

  async function handleStart() {
    if (!file) { setError("Please upload an audio track first."); return; }
    setError("");
    setCreating(true);
    setUploading(true);
    try {
      const audioData = await uploadAudio(file);
      setUploading(false);
      const job = await createJob({
        style_preset_id: selectedPresetId,
        audio_url: audioData.audio_url,
        audio_file_name: audioData.audio_file_name,
        audio_duration_seconds: audioData.detected_duration_seconds,
        audio_file_size_bytes: audioData.file_size_bytes,
      });
      router.push(`/job/${job.id}`);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setUploading(false);
      setCreating(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="vg-shell">
      <main className="vg-page" style={{ maxWidth: "860px", margin: "0 auto" }}>
        {/* Header */}
        <div>
          <p className="vg-eyebrow">Create</p>
          <h1>Generate a new music video</h1>
          <p className="vg-secondary" style={{ marginTop: "6px" }}>
            Upload your track and choose a cinematic style. VIGEN will analyse the beats and craft a beat-synchronized storyboard for your approval.
          </p>
        </div>

        {error && <ErrorBanner message={error} onRetry={() => setError("")} />}

        {/* Step 1: Upload */}
        <div className="vg-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <span className="vg-scene-num" style={{ width: "32px", height: "32px", fontSize: "0.85rem" }}>01</span>
            <h2>Upload audio</h2>
          </div>
          <DragUploader file={file} onFile={setFile} uploading={uploading} />
        </div>

        {/* Step 2: Style */}
        <div className="vg-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <span className="vg-scene-num" style={{ width: "32px", height: "32px", fontSize: "0.85rem" }}>02</span>
            <h2>Choose style</h2>
          </div>
          {presets.length === 0 ? (
            <div className="vg-preset-grid">
              {[1,2,3,4,5,6].map((i) => <Skeleton key={i} height={120} />)}
            </div>
          ) : (
            <div className="vg-preset-grid">
              {presets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  selected={selectedPresetId === preset.id}
                  onSelect={setSelectedPresetId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "16px", paddingBottom: "16px" }}>
          <ActionLink href="/dashboard" secondary>Cancel</ActionLink>
          <button
            className="vg-btn vg-btn-lg"
            onClick={handleStart}
            disabled={creating || !file}
            style={{ minWidth: "220px" }}
          >
            {creating
              ? (uploading ? "Uploading audio…" : "Creating job…")
              : "Start generation →"}
          </button>
        </div>
      </main>
    </div>
  );
}
