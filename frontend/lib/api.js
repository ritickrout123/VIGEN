import { getAccessToken } from "./auth.js";
import { mockJobs, mockPresets } from "./mock-data.js";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

async function request(path, options = {}) {
  if (USE_MOCKS) {
    return handleMock(path, options);
  }

  const token = getAccessToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Request failed");
  }

  return response.status === 204 ? null : response.json();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function handleMock(path, options = {}) {
  if (path === "/api/presets") {
    return clone(mockPresets);
  }

  if (path === "/api/jobs" && (!options.method || options.method === "GET")) {
    return clone(mockJobs);
  }

  if (path === "/api/jobs" && options.method === "POST") {
    const payload = JSON.parse(options.body);
    const created = clone(mockJobs[0]);
    created.id = `job-${Date.now()}`;
    created.audio_file_name = payload.audio_file_name;
    created.audio_url = payload.audio_url;
    created.audio_duration_seconds = payload.audio_duration_seconds;
    created.created_at = new Date().toISOString();
    created.updated_at = created.created_at;
    return created;
  }

  if (path.startsWith("/api/jobs/") && path.endsWith("/approve")) {
    return { job_id: path.split("/")[3], status: "rendering", storyboard_approved: true };
  }

  if (path.startsWith("/api/jobs/") && path.endsWith("/reject")) {
    return clone(mockJobs[0]);
  }

  if (path.startsWith("/api/jobs/") && path.includes("/scenes/") && path.endsWith("/retry")) {
    return clone(mockJobs[0]);
  }

  if (path.startsWith("/api/jobs/")) {
    const jobId = path.split("/")[3];
    const match = mockJobs.find((job) => job.id === jobId) || mockJobs[0];
    return clone(match);
  }

  throw new Error(`Missing mock route for ${path}`);
}

export function register(payload) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function login(payload) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchPresets() {
  return request("/api/presets");
}

export function uploadAudio(file) {
  if (USE_MOCKS) {
    return Promise.resolve({
      audio_file_name: file.name,
      audio_url: `/media/mock/${file.name}`,
      file_size_bytes: file.size,
      detected_duration_seconds: 30
    });
  }

  const formData = new FormData();
  formData.append("file", file);
  return request("/api/uploads/audio", {
    method: "POST",
    body: formData,
    headers: {}
  });
}

export function createJob(payload) {
  return request("/api/jobs", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchJobs() {
  return request("/api/jobs");
}

export function fetchJob(jobId) {
  return request(`/api/jobs/${jobId}`);
}

export function approveStoryboard(jobId) {
  return request(`/api/jobs/${jobId}/approve`, {
    method: "POST"
  });
}

export function rejectStoryboard(jobId, reason) {
  return request(`/api/jobs/${jobId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export function retryScene(jobId, sceneIndex, reason) {
  return request(`/api/jobs/${jobId}/scenes/${sceneIndex}/retry`, {
    method: "POST",
    body: JSON.stringify({ job_id: jobId, reason })
  });
}

