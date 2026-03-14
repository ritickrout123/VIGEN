import Link from "next/link";
import React from "react";
import { ActionLink, Card } from "../components/ui.jsxx";

const PIPELINE_NODES = [
  { icon: "🎵", label: "Upload" },
  { icon: "🔍", label: "Analysis" },
  { icon: "📋", label: "Storyboard" },
  { icon: "✅", label: "Approval" },
  { icon: "🎬", label: "Render" },
  { icon: "🎉", label: "Deliver" },
];

const TRUST_CHIPS = [
  { icon: "🔒", text: "Approval gate before GPU spend" },
  { icon: "⚡", text: "Real-time progress via WebSocket" },
  { icon: "🎭", text: "Preview at ~30% scenes complete" },
  { icon: "↺", text: "Per-scene regeneration" },
];

const PRESETS = [
  { name: "Cinematic Pulse",  colors: ["#0F172A", "#F97316", "#F8FAFC"], tags: "dolly · cinematic" },
  { name: "Neon Drift",       colors: ["#1E1B4B", "#06B6D4", "#F43F5E"], tags: "pan · neon" },
  { name: "Anime Storm",      colors: ["#1a0533", "#e11d48", "#fbbf24"], tags: "zoom · dramatic" },
  { name: "Ethereal Drift",   colors: ["#e0e7ff", "#c4b5fd", "#fbcfe8"], tags: "static · soft" },
  { name: "Retro Grain",      colors: ["#78350f", "#d97706", "#fef3c7"], tags: "pan · natural" },
  { name: "Documentary",      colors: ["#1c1917", "#78716c", "#e7e5e4"], tags: "tilt · natural" },
];

export default function HomePage() {
  return (
    <div className="shell">
      <main className="page-grid">

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div className="hero-section">
          <div className="hero-grid">
            <div>
              <div className="kicker">Phase 1 MVP · March 2026</div>
              <h1 className="headline" style={{ marginTop: "12px", marginBottom: "20px" }}>
                Turn a track into a cinematic video.
              </h1>
              <p className="lede" style={{ marginBottom: "28px" }}>
                Upload any audio. VIGEN analyses the beat map, generates a scene-by-scene storyboard you approve, then renders each clip in parallel and assembles the final MP4 — all without a production team.
              </p>
              <div className="actions">
                <ActionLink href="/create">🎬 Create a job</ActionLink>
                <ActionLink href="/dashboard" secondary>Open dashboard</ActionLink>
              </div>
              <div className="trust-row" style={{ marginTop: "28px" }}>
                {TRUST_CHIPS.map((chip) => (
                  <span key={chip.text} className="trust-chip">
                    <span>{chip.icon}</span>
                    {chip.text}
                  </span>
                ))}
              </div>
            </div>

            {/* Pipeline diagram */}
            <Card>
              <div className="kicker">How it works</div>
              <div className="pipeline-diagram" style={{ marginTop: "16px" }}>
                {PIPELINE_NODES.map((node, i) => (
                  <React.Fragment key={node.label}>
                    <div className="pipeline-node">
                      <div className="pipeline-node-icon">{node.icon}</div>
                      <div className="pipeline-node-label">{node.label}</div>
                    </div>
                    {i < PIPELINE_NODES.length - 1 && (
                      <span className="pipeline-arrow">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <p className="small muted" style={{ marginTop: "16px" }}>
                Storyboard approval gates GPU spend. Rendering is fully asynchronous — you'll get a preview after the first batch of scenes, then a download link on completion.
              </p>
            </Card>
          </div>
        </div>

        {/* ── Style Preset Gallery ─────────────────────────────────── */}
        <Card>
          <div className="kicker">Style presets</div>
          <h2 style={{ marginBottom: "6px" }}>Six launch styles</h2>
          <p className="lede" style={{ marginBottom: "20px" }}>
            Choose a preset when you create a job. Each injects a curated prompt modifier, color palette, and motion bias into scene generation.
          </p>
          <div className="preset-grid">
            {PRESETS.map((preset) => (
              <div key={preset.name} className="preset-card">
                <div className="preset-palette">
                  {preset.colors.map((hex) => (
                    <div key={hex} className="preset-palette-swatch" style={{ background: hex }} />
                  ))}
                </div>
                <strong style={{ fontSize: "0.9rem" }}>{preset.name}</strong>
                <p className="small muted" style={{ margin: 0 }}>{preset.tags}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <Card style={{ textAlign: "center", padding: "40px" }}>
          <div className="kicker">Ready?</div>
          <h2 style={{ marginBottom: "12px" }}>Start your first render</h2>
          <div className="actions" style={{ justifyContent: "center" }}>
            <ActionLink href="/create">🎬 Create a job</ActionLink>
            <ActionLink href="/login" secondary>Log in</ActionLink>
          </div>
        </Card>
      </main>
    </div>
  );
}
