import Link from "next/link";
import React from "react";

const FLOW = [
  { icon: "🎵", label: "Upload" },
  { icon: "🔍", label: "Analysis" },
  { icon: "📋", label: "Storyboard" },
  { icon: "✅", label: "Approve" },
  { icon: "🎬", label: "Render" },
  { icon: "🎉", label: "Deliver" },
];

const TRUST = [
  { icon: "🔒", text: "Approve before GPU spend" },
  { icon: "⚡", text: "Real-time WebSocket progress" },
  { icon: "🎭", text: "Preview at 30% complete" },
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
    <div className="vg-shell">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="vg-hero">
        <div className="vg-hero-grid">
          <div>
            <p className="vg-eyebrow">AI Music Video Generator</p>
            <h1 className="vg-headline">
              Turn a track into a cinematic video.
            </h1>
            <p className="vg-lede" style={{ marginTop: "20px", maxWidth: "520px" }}>
              Upload any audio. VIGEN analyses the beat map, generates a scene-by-scene storyboard you approve, then renders each clip in parallel and assembles the final MP4.
            </p>
            <div className="vg-actions" style={{ marginTop: "32px" }}>
              <Link href="/create" className="vg-btn vg-btn-lg">🎬 Create a video</Link>
              <Link href="/login" className="vg-btn-secondary vg-btn-lg">Log in</Link>
            </div>
            <div className="vg-trust-row">
              {TRUST.map((t) => (
                <span key={t.text} className="vg-trust-chip">
                  <span>{t.icon}</span>{t.text}
                </span>
              ))}
            </div>
          </div>

          {/* Pipeline card */}
          <div className="vg-card">
            <p className="vg-eyebrow">How it works</p>
            <div className="vg-flow" style={{ marginTop: "16px" }}>
              {FLOW.map((node, i) => (
                <React.Fragment key={node.label}>
                  <div className="vg-flow-node">
                    <div className="vg-flow-icon">{node.icon}</div>
                    <span className="vg-flow-label">{node.label}</span>
                  </div>
                  {i < FLOW.length - 1 && <span className="vg-flow-arrow">→</span>}
                </React.Fragment>
              ))}
            </div>
            <p className="vg-small vg-secondary" style={{ marginTop: "16px", lineHeight: 1.6 }}>
              Storyboard approval gates GPU spend. Rendering is fully async — you get a preview after the first batch of scenes, then a download link on completion.
            </p>
          </div>
        </div>
      </section>

      {/* ── Style Presets ─────────────────────────────────────────── */}
      <section className="vg-card" style={{ marginBottom: "24px" }}>
        <p className="vg-eyebrow">Style presets</p>
        <h2 style={{ marginBottom: "6px" }}>Six launch styles</h2>
        <p className="vg-lede" style={{ marginBottom: "24px", maxWidth: "560px" }}>
          Each preset injects a curated prompt modifier, color palette, and motion bias into scene generation.
        </p>
        <div className="vg-preset-grid">
          {PRESETS.map((p) => (
            <div key={p.name} className="vg-card-sm" style={{ gap: "10px", display: "grid" }}>
              <div style={{ display: "flex", height: "6px", borderRadius: "4px", overflow: "hidden", gap: "2px" }}>
                {p.colors.map((hex) => (
                  <div key={hex} style={{ flex: 1, background: hex }} />
                ))}
              </div>
              <strong className="vg-small" style={{ color: "var(--ink)" }}>{p.name}</strong>
              <p className="vg-small vg-secondary">{p.tags}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="vg-card" style={{ textAlign: "center", padding: "56px 32px", marginBottom: "48px" }}>
        <p className="vg-eyebrow">Ready?</p>
        <h2 style={{ marginBottom: "8px" }}>Start your first render</h2>
        <p className="vg-secondary" style={{ marginBottom: "28px" }}>
          No production team. No timeline. Just upload and approve.
        </p>
        <div className="vg-actions" style={{ justifyContent: "center" }}>
          <Link href="/register" className="vg-btn vg-btn-lg">Create free account</Link>
          <Link href="/login" className="vg-btn-secondary vg-btn-lg">Log in</Link>
        </div>
      </section>
    </div>
  );
}
