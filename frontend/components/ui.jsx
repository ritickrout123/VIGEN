import Link from "next/link";
import React from "react";

/* ─── Shell ──────────────────────────────────────────────────────── */
export function Shell({ children }) {
  return <div className="shell">{children}</div>;
}

/* ─── Topbar ─────────────────────────────────────────────────────── */
export function Topbar({ session, onLogout }) {
  return (
    <header className="topbar shell">
      <Link href="/" className="brand">▶ VIGEN</Link>
      <nav className="nav-links">
        {session ? (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/create">Create</Link>
            <button key="logout" onClick={onLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link href="/login">Log in</Link>
            <Link href="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}

/* ─── Card ───────────────────────────────────────────────────────── */
export function Card({ children, className = "", style = {} }) {
  return (
    <section className={`card ${className}`.trim()} style={style}>
      {children}
    </section>
  );
}

export function CardSm({ children, className = "" }) {
  return <div className={`card-sm ${className}`.trim()}>{children}</div>;
}

/* ─── Status Badge ───────────────────────────────────────────────── */
const STATUS_LABELS = {
  pending: "Pending",
  queued: "Queued",
  analysing: "Analysing",
  planning: "Planning",
  awaiting_approval: "Needs Review",
  rendering: "Rendering",
  assembling: "Assembling",
  complete: "Complete",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function StatusBadge({ value }) {
  const label = STATUS_LABELS[value] || value || "Unknown";
  return (
    <span className={`status-badge status-${value || "pending"}`}>
      {label}
    </span>
  );
}

/* ─── Progress Bar ───────────────────────────────────────────────── */
export function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ─── Pipeline Tracker ───────────────────────────────────────────── */
const STAGES = [
  { key: "analysis",  label: "Analysis",  icon: "🎵" },
  { key: "planning",  label: "Planning",  icon: "📋" },
  { key: "approval",  label: "Review",    icon: "✅" },
  { key: "rendering", label: "Rendering", icon: "🎬" },
  { key: "assembly",  label: "Assembly",  icon: "⚙️" },
  { key: "done",      label: "Done",      icon: "🎉" },
];

const STAGE_ORDER = STAGES.map((s) => s.key);

export function PipelineTracker({ currentStage, status }) {
  const effectiveStage = status === "complete" ? "done" : currentStage;
  const currentIndex = STAGE_ORDER.indexOf(effectiveStage);

  return (
    <div className="pipeline-tracker">
      {STAGES.map((step, i) => {
        const isDone = i < currentIndex || status === "complete";
        const isActive = i === currentIndex && status !== "complete";
        const cls = `pipeline-step ${isDone ? "done" : ""} ${isActive ? "active" : ""}`.trim();

        return (
          <React.Fragment key={step.key}>
            <div className={cls}>
              <div className="pipeline-step-inner">
                <div className="pipeline-step-dot">
                  {isDone ? "✓" : step.icon}
                </div>
                <span className="pipeline-step-label">{step.label}</span>
              </div>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`pipeline-connector ${isDone ? "done" : ""}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Stat Row ───────────────────────────────────────────────────── */
export function StatRow({ label, value }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value ?? "—"}</span>
    </div>
  );
}

/* ─── Color Palette Swatches ─────────────────────────────────────── */
export function ColorPalette({ colors = [] }) {
  return (
    <div className="color-palette">
      {colors.map((hex) => (
        <span
          key={hex}
          className="color-swatch"
          style={{ background: hex }}
          title={hex}
        />
      ))}
    </div>
  );
}

/* ─── Badge ──────────────────────────────────────────────────────── */
export function Badge({ children }) {
  return <span className="badge">{children}</span>;
}

/* ─── Scene Card ─────────────────────────────────────────────────── */
export function SceneCard({ scene, onRetry, showRetry = false }) {
  return (
    <article className="scene-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <span className="scene-number">{scene.scene_index + 1}</span>
        <StatusBadge value={scene.status} />
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        {scene.start_time_seconds}s – {scene.end_time_seconds}s
      </p>
      <p className="small" style={{ margin: "4px 0", lineHeight: 1.5 }}>
        {scene.visual_prompt || scene.visual_description}
      </p>
      <div className="badge-row">
        {scene.mood && <Badge>🎭 {scene.mood}</Badge>}
        {scene.camera_angle && <Badge>📷 {scene.camera_angle.replace(/_/g, " ")}</Badge>}
        {scene.motion_type && <Badge>↔ {scene.motion_type}</Badge>}
      </div>
      <ColorPalette colors={scene.color_palette || []} />
      {showRetry && onRetry && (
        <button className="btn-ghost" type="button" onClick={() => onRetry(scene.scene_index)}>
          ↺ Retry scene
        </button>
      )}
    </article>
  );
}

/* ─── Preset Card ────────────────────────────────────────────────── */
export function PresetCard({ preset, selected, onSelect }) {
  return (
    <div
      className={`preset-card ${selected ? "selected" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(preset.id)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(preset.id)}
    >
      <div className="preset-palette">
        {(preset.color_palette || []).map((hex) => (
          <div key={hex} className="preset-palette-swatch" style={{ background: hex }} />
        ))}
      </div>
      <strong style={{ fontSize: "0.92rem" }}>{preset.name}</strong>
      <p className="small muted" style={{ margin: 0, lineHeight: 1.4 }}>{preset.description}</p>
      <div className="badge-row">
        {preset.motion_bias && <Badge>↔ {preset.motion_bias}</Badge>}
        {preset.lighting_bias && <Badge>💡 {preset.lighting_bias}</Badge>}
      </div>
    </div>
  );
}

/* ─── Drag Uploader ──────────────────────────────────────────────── */
export function DragUploader({ onFile, file, uploading }) {
  function handleDrop(e) {
    e.preventDefault();
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) validate(dropped);
  }

  function handleChange(e) {
    const picked = e.target.files?.[0];
    if (picked) validate(picked);
  }

  function validate(f) {
    const ok = ["audio/mpeg", "audio/wav", "audio/flac", "audio/x-flac"].includes(f.type)
      || /\.(mp3|wav|flac)$/i.test(f.name);
    if (!ok) { alert("Please choose an MP3, WAV, or FLAC file."); return; }
    if (f.size > 200 * 1024 * 1024) { alert("File must be under 200 MB."); return; }
    onFile(f);
  }

  function handleDragOver(e) { e.preventDefault(); }

  const label = file
    ? `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`
    : "Drop your MP3, WAV, or FLAC here";

  return (
    <label
      className="dropzone"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input type="file" accept=".mp3,.wav,.flac" onChange={handleChange} style={{ display: "none" }} />
      <span className="dropzone-icon">{file ? "🎵" : "📁"}</span>
      <strong>{uploading ? "Uploading…" : label}</strong>
      {!file && <p className="small muted" style={{ marginTop: "6px" }}>MP3 · WAV · FLAC · Max 200 MB</p>}
    </label>
  );
}

/* ─── Video Player ───────────────────────────────────────────────── */
export function VideoPlayer({ src, label = "Video", downloadHref }) {
  if (!src) {
    return (
      <div className="video-placeholder">
        <span className="video-placeholder-icon">🎬</span>
        <p className="small muted">Video will appear here once ready.</p>
      </div>
    );
  }

  return (
    <div className="video-container">
      <video src={src} controls preload="metadata" style={{ width: "100%", height: "100%" }} />
      {downloadHref && (
        <div style={{ marginTop: "12px", display: "flex", gap: "10px" }}>
          <a href={downloadHref} className="btn-secondary" download>⬇ Download MP4</a>
          <button
            className="btn-ghost"
            onClick={() => { navigator.clipboard?.writeText(window.location.href); }}
          >
            🔗 Copy share link
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────────────────── */
export function EmptyState({ title, body, icon = "📭", action }) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <strong style={{ display: "block", marginBottom: "8px" }}>{title}</strong>
      <p className="small muted" style={{ marginBottom: action ? "20px" : 0 }}>{body}</p>
      {action}
    </div>
  );
}

/* ─── Action Link ────────────────────────────────────────────────── */
export function ActionLink({ href, children, secondary = false, className = "" }) {
  const cls = secondary ? "btn-secondary" : "btn";
  return <Link href={href} className={`${cls} ${className}`.trim()}>{children}</Link>;
}
