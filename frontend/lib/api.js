import { getAccessToken } from "./auth.js";
import { mockJobs, mockPresets } from "./mock-data.js";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

/* ─── Core request helper ────────────────────────────────────────── */
async function request(path, options = {}) {
  if (USE_MOCKS) {
    return handleMock(path, options);
  }

  const token = getAccessToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Request failed");
  }

  return response.status === 204 ? null : response.json();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/* ─── Mock route handler ─────────────────────────────────────────── */
async function handleMock(path, options = {}) {
  // Simulated network delay for realism
  await new Promise((resolve) => setTimeout(resolve, 180 + Math.random() * 120));

  if (path === "/api/presets") return clone(mockPresets);

  if (path === "/api/jobs" && (!options.method || options.method === "GET")) {
    return clone(mockJobs);
  }

  if (path === "/api/jobs" && options.method === "POST") {
    const payload = JSON.parse(options.body);
    const template = clone(mockJobs[0]);
    template.id = `job-${Date.now()}`;
    template.audio_file_name = payload.audio_file_name;
    template.audio_url = payload.audio_url;
    template.audio_duration_seconds = payload.audio_duration_seconds;
    template.status = "awaiting_approval";
    template.created_at = new Date().toISOString();
    template.updated_at = template.created_at;
    if (payload.style_preset_id) {
      template.style_preset_id = payload.style_preset_id;
    }
    return template;
  }

  if (path.startsWith("/api/jobs/") && path.endsWith("/approve")) {
    const jobId = path.split("/")[3];
    const job = clone(mockJobs.find((j) => j.id === jobId) || mockJobs[0]);
    job.status = "rendering";
    job.storyboard_approved = true;
    job.storyboard_approved_at = new Date().toISOString();
    return { job_id: job.id, status: job.status, storyboard_approved: true };
  }

  if (path.startsWith("/api/jobs/") && path.endsWith("/reject")) {
    const jobId = path.split("/")[3];
    const payload = options.body ? JSON.parse(options.body) : {};
    const job = clone(mockJobs.find((j) => j.id === jobId) || mockJobs[0]);
    job.status = "awaiting_approval";
    job.storyboard_rejection_reason = payload.reason || "";
    job.storyboard_regeneration_count += 1;
    return job;
  }

  if (path.includes("/scenes/") && path.endsWith("/retry")) {
    const parts = path.split("/");
    const jobId = parts[3];
    const job = clone(mockJobs.find((j) => j.id === jobId) || mockJobs[0]);
    const sceneIndex = parseInt(parts[5], 10);
    const scene = job.scenes.find((s) => s.scene_index === sceneIndex);
    if (scene) {
      scene.status = "pending";
      scene.regeneration_count += 1;
    }
    return job;
  }

  if (path.startsWith("/api/jobs/")) {
    const jobId = path.split("/")[3];
    const match = mockJobs.find((j) => j.id === jobId) || mockJobs[0];
    return clone(match);
  }

  if (path === "/auth/login" || path === "/auth/register") {
    const payload = options.body ? JSON.parse(options.body) : {};
    return {
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      user: {
        id: "demo-user",
        email: payload.email || "demo@vigen.app",
        username: payload.username || "demo",
        role: "user",
        credits_balance: 250
      }
    };
  }

  throw new Error(`Missing mock route for ${path}`);
}

/* ─── Mock progress simulation (WebSocket equivalent) ───────────── */
/**
 * Subscribe to job progress events.
 * In mock mode: simulates scene-by-scene rendering with setInterval.
 * In real mode: connects to the backend WebSocket and forwards events.
 *
 * @param {string} jobId
 * @param {(event: {stage: string, percent: number, scenes_complete: number, scenes_total: number, message: string}) => void} onEvent
 * @param {() => void} [onComplete]
 * @returns {() => void} cleanup function — call to stop subscription
 */
export function subscribeToJobProgress(jobId, onEvent, onComplete) {
  if (USE_MOCKS) {
    return _mockProgressSimulation(jobId, onEvent, onComplete);
  }

  // Real WebSocket connection
  const wsUrl = `${API_BASE_URL.replace(/^http/, "ws")}/api/jobs/${jobId}/ws`;
  let ws;
  try {
    ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent(data);
        if (data.stage === "done") onComplete?.();
      } catch {
        // ignore malformed frames
      }
    };
    ws.onerror = () => {
      // fallback: caller can degrade to polling
    };
  } catch {
    // WebSocket not available in this env
  }

  return () => ws?.close();
}

function _mockProgressSimulation(jobId, onEvent, onComplete) {
  // Find job to know how many scenes it has
  const job = mockJobs.find((j) => j.id === jobId);
  const scenesTotal = job?.scenes_total ?? 9;
  const alreadyComplete = job?.scenes_completed ?? 0;

  if (job?.status === "complete") {
    // Already done — immediately fire a done event
    setTimeout(() => {
      onEvent({ stage: "done", percent: 100, scenes_complete: scenesTotal, scenes_total: scenesTotal, message: "Video complete" });
      onComplete?.();
    }, 300);
    return () => {};
  }

  if (job?.status !== "rendering" && job?.status !== "assembling" && job?.status !== "awaiting_approval") {
    // Not a progressable state
    return () => {};
  }

  let scenesComplete = alreadyComplete;
  let stopped = false;

  // Progression: 1 scene every ~2 seconds for demo purposes
  const SCENE_INTERVAL_MS = 2000;

  const tick = () => {
    if (stopped) return;
    if (scenesComplete < scenesTotal) {
      scenesComplete += 1;
      const percent = Math.min(90, 40 + Math.round((scenesComplete / scenesTotal) * 50));
      onEvent({
        stage: "rendering",
        percent,
        scenes_complete: scenesComplete,
        scenes_total: scenesTotal,
        message: `Rendered scene ${scenesComplete} of ${scenesTotal}`
      });

      if (scenesComplete >= scenesTotal) {
        // Trigger assembly phase
        setTimeout(() => {
          if (stopped) return;
          onEvent({ stage: "assembling", percent: 95, scenes_complete: scenesTotal, scenes_total: scenesTotal, message: "Assembling final video…" });
          setTimeout(() => {
            if (stopped) return;
            onEvent({ stage: "done", percent: 100, scenes_complete: scenesTotal, scenes_total: scenesTotal, message: "Video complete 🎉" });
            onComplete?.();
          }, 1800);
        }, 1200);
      } else {
        setTimeout(tick, SCENE_INTERVAL_MS);
      }
    }
  };

  const timerId = setTimeout(tick, 1000);

  return () => {
    stopped = true;
    clearTimeout(timerId);
  };
}

/* ─── Public API surface ─────────────────────────────────────────── */
export function register(payload) {
  return request("/auth/register", { method: "POST", body: JSON.stringify(payload) });
}

export function login(payload) {
  return request("/auth/login", { method: "POST", body: JSON.stringify(payload) });
}

export function fetchPresets() {
  return request("/api/presets");
}

export function uploadAudio(file) {
  if (USE_MOCKS) {
    return new Promise((resolve) =>
      setTimeout(() => resolve({
        audio_file_name: file.name,
        audio_url: `/media/mock/${file.name}`,
        file_size_bytes: file.size,
        detected_duration_seconds: 45
      }), 600 + Math.random() * 400)
    );
  }
  const formData = new FormData();
  formData.append("file", file);
  return request("/api/uploads/audio", { method: "POST", body: formData, headers: {} });
}

export function createJob(payload) {
  return request("/api/jobs", { method: "POST", body: JSON.stringify(payload) });
}

export function fetchJobs() {
  return request("/api/jobs");
}

export function fetchJob(jobId) {
  return request(`/api/jobs/${jobId}`);
}

export function approveStoryboard(jobId) {
  return request(`/api/jobs/${jobId}/approve`, { method: "POST" });
}

export function rejectStoryboard(jobId, reason) {
  return request(`/api/jobs/${jobId}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
}

export function retryScene(jobId, sceneIndex, reason) {
  return request(`/api/jobs/${jobId}/scenes/${sceneIndex}/retry`, {
    method: "POST",
    body: JSON.stringify({ job_id: jobId, reason })
  });
}
