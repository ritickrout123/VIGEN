import Link from "next/link";
import React from "react";

/* ─── Shell ──────────────────────────────────────────────────────── */
export function Shell({ children }) {
  return <div className="vg-shell">{children}</div>;
}

/* ─── Topbar ─────────────────────────────────────────────────────── */
export function Topbar({ session, onLogout }) {
  return (
    <header className="vg-topbar vg-shell">
      <Link href="/" className="vg-brand">▶ VIGEN</Link>
      <nav className="vg-nav">
        {session ? (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/create">Create</Link>
            <button onClick={onLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link href="/login">Log in</Link>
            <Link href="/register" className="vg-nav-cta">Get started</Link>
          </>
        )}
      </nav>
    </header>
  );
}

/* ─── Card ───────────────────────────────────────────────────────── */
export function Card({ children, className = "", style = {} }) {
  return (
    <section className={`vg-card ${className}`.trim()} style={style}>
      {children}
    </section>
  );
}

/* ─── Status Badge ───────────────────────────────────────────────── */
const STATUS_LABELS = {
  pending:           "Pending",
  queued:            "Queued",
  analysing:         "Analysing",
  planning:          "Planning",
  awaiting_approval: "Needs Review",
  rendering:         "Rendering",
  assembling:        "Assembling",
  complete:          "Complete",
  failed:            "Failed",
  cancelled:         "Cancelled",
};

export function StatusBadge({ value }) {
  const label = STATUS_LABELS[value] || value || "Unknown";
  return (
    <span className={`vg-badge vg-badge-${value || "pending"}`}>
      {label}
    </span>
  );
}

/* ─── Progress Bar ───────────────────────────────────────────────── */
export function ProgressBar({ value, animated = false }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="vg-progress" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
      <div
        className={`vg-progress-fill${animated ? " is-animated" : ""}`}
        style={{ width: `${pct}%` }}
      />
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
    <div className="vg-pipeline">
      {STAGES.map((step, i) => {
        const isDone = i < currentIndex || status === "complete";
        const isActive = i === currentIndex && status !== "complete";
        const cls = `vg-pipeline-step${isDone ? " is-done" : ""}${isActive ? " is-active" : ""}`;
        return (
          <React.Fragment key={step.key}>
            <div className={cls}>
              <div className="vg-pipeline-dot">
                {isDone ? "✓" : step.icon}
              </div>
              <span className="vg-pipeline-label">{step.label}</span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`vg-pipeline-connector${isDone ? " is-done" : ""}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Stat Row ───────────────────────────────────────────────────── */
export function StatRow({ label, value, mono = false }) {
  return (
    <div className="vg-stat-row">
      <span className="vg-small vg-secondary">{label}</span>
      <span className={`vg-small${mono ? " vg-mono" : ""}`} style={{ color: "var(--ink)", fontWeight: 500 }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

/* ─── Color Swatches ─────────────────────────────────────────────── */
export function ColorSwatches({ colors = [] }) {
  if (!colors.length) return null;
  return (
    <div className="vg-swatches">
      {colors.map((hex, i) => (
        <span key={`${hex}-${i}`} className="vg-swatch" style={{ background: hex }} title={hex} />
      ))}
    </div>
  );
}

/* ─── Tag ────────────────────────────────────────────────────────── */
export function Tag({ children }) {
  return <span className="vg-tag">{children}</span>;
}

/* ─── Scene Card ─────────────────────────────────────────────────── */
export function SceneCard({ scene, onRetry, showRetry = false }) {
  const statusCls = scene.status === "failed" ? " is-failed" : scene.status === "complete" ? " is-complete" : "";
  const timecode = (s) => {
    if (s == null) return "—";
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <article className={`vg-scene-card${statusCls}`}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="vg-scene-num">{scene.scene_index + 1}</span>
          <span className="vg-small vg-mono vg-secondary">
            {timecode(scene.start_time_seconds)} – {timecode(scene.end_time_seconds)}
          </span>
        </div>
        <StatusBadge value={scene.status} />
      </div>

      {/* Visual prompt */}
      <p className="vg-small" style={{ color: "var(--ink)", lineHeight: 1.55 }}>
        {scene.visual_prompt || scene.visual_description || "—"}
      </p>

      {/* Metadata tags */}
      <div className="vg-tag-row">
        {scene.mood && <Tag>🎭 {scene.mood}</Tag>}
        {scene.camera_angle && <Tag>📷 {scene.camera_angle.replace(/_/g, " ")}</Tag>}
        {scene.motion_type && <Tag>↔ {scene.motion_type}</Tag>}
        {scene.lighting_style && <Tag>💡 {scene.lighting_style}</Tag>}
        {scene.beat_importance_score != null && (
          <Tag>♩ {Math.round(scene.beat_importance_score * 100)}%</Tag>
        )}
        {scene.duration_seconds != null && (
          <Tag className="vg-mono">{scene.duration_seconds.toFixed(1)}s</Tag>
        )}
      </div>

      {/* Color palette */}
      <ColorSwatches colors={scene.color_palette || []} />

      {/* Cost / render info (if complete) */}
      {scene.status === "complete" && (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {scene.cost_usd != null && (
            <span className="vg-small vg-mono vg-secondary">${Number(scene.cost_usd).toFixed(2)}</span>
          )}
          {scene.video_model_used && (
            <span className="vg-small vg-secondary">{scene.video_model_used}</span>
          )}
          {scene.render_time_seconds != null && (
            <span className="vg-small vg-secondary">{scene.render_time_seconds.toFixed(1)}s render</span>
          )}
        </div>
      )}

      {/* Retry */}
      {showRetry && onRetry && scene.status === "failed" && (
        <button className="vg-btn-ghost" type="button" onClick={() => onRetry(scene.scene_index)}>
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
      className={`vg-preset-card${selected ? " is-selected" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(preset.id)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(preset.id)}
    >
      <div className="vg-preset-palette">
        {(preset.color_palette || []).map((hex, i) => (
          <div key={`${hex}-${i}`} className="vg-preset-swatch" style={{ background: hex }} />
        ))}
      </div>
      <strong style={{ fontSize: "0.9rem", color: "var(--ink)" }}>{preset.name}</strong>
      <p className="vg-small vg-secondary" style={{ lineHeight: 1.4 }}>{preset.description}</p>
      <div className="vg-tag-row">
        {preset.motion_bias && <Tag>↔ {preset.motion_bias}</Tag>}
        {preset.lighting_bias && <Tag>💡 {preset.lighting_bias}</Tag>}
      </div>
    </div>
  );
}

/* ─── Drag Uploader ──────────────────────────────────────────────── */
export function DragUploader({ onFile, file, uploading }) {
  const [isOver, setIsOver] = React.useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setIsOver(false);
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

  const cls = `vg-dropzone${isOver ? " is-over" : ""}${file ? " has-file" : ""}`;

  return (
    <label
      className={cls}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
    >
      <input type="file" accept=".mp3,.wav,.flac" onChange={handleChange} />
      <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>{file ? "🎵" : "📁"}</div>
      {uploading ? (
        <p style={{ color: "var(--purple)", fontWeight: 600 }}>Uploading…</p>
      ) : file ? (
        <>
          <p style={{ fontWeight: 600, color: "var(--teal)" }}>{file.name}</p>
          <p className="vg-small vg-secondary" style={{ marginTop: "4px" }}>
            {(file.size / 1024 / 1024).toFixed(1)} MB · Click to change
          </p>
        </>
      ) : (
        <>
          <p style={{ fontWeight: 600 }}>Drop your audio file here</p>
          <p className="vg-small vg-secondary" style={{ marginTop: "6px" }}>MP3 · WAV · FLAC · Max 200 MB</p>
        </>
      )}
    </label>
  );
}

/* ─── Video Player ───────────────────────────────────────────────── */
export function VideoPlayer({ src, downloadHref }) {
  if (!src) {
    return (
      <div className="vg-video-empty">
        <span style={{ fontSize: "2.5rem" }}>🎬</span>
        <p className="vg-small vg-secondary">Video will appear here once ready.</p>
      </div>
    );
  }
  return (
    <div>
      <div className="vg-video-wrap">
        <video src={src} controls preload="metadata" />
      </div>
      {downloadHref && (
        <div className="vg-actions" style={{ marginTop: "12px" }}>
          <a href={downloadHref} className="vg-btn" download>⬇ Download MP4</a>
          <button
            className="vg-btn-secondary"
            onClick={() => navigator.clipboard?.writeText(window.location.href)}
          >
            🔗 Copy link
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────────────────── */
export function EmptyState({ title, body, icon = "📭", action }) {
  return (
    <div className="vg-empty">
      <span className="vg-empty-icon">{icon}</span>
      <strong style={{ color: "var(--ink)" }}>{title}</strong>
      <p className="vg-small vg-secondary">{body}</p>
      {action}
    </div>
  );
}

/* ─── Action Link ────────────────────────────────────────────────── */
export function ActionLink({ href, children, secondary = false, className = "" }) {
  const cls = secondary ? "vg-btn-secondary" : "vg-btn";
  return <Link href={href} className={`${cls} ${className}`.trim()}>{children}</Link>;
}

/* ─── Skeleton ───────────────────────────────────────────────────── */
export function Skeleton({ height = 20, width = "100%", style = {} }) {
  return (
    <div
      className="vg-skeleton"
      style={{ height, width, ...style }}
    />
  );
}

/* ─── Error Banner ───────────────────────────────────────────────── */
export function ErrorBanner({ message, onRetry }) {
  return (
    <div className="vg-error-banner">
      <span>⚠</span>
      <div style={{ flex: 1 }}>
        <span>{message}</span>
        {onRetry && (
          <button
            className="vg-btn-ghost"
            onClick={onRetry}
            style={{ marginLeft: "12px", minHeight: "28px", padding: "0 10px", fontSize: "0.8rem" }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
