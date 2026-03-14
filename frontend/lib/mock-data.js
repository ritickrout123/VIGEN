export const mockPresets = [
  {
    id: "preset-cinematic-pulse",
    name: "Cinematic Pulse",
    description: "Premium performance look with rich contrast and bold camera motion.",
    prompt_modifier: "cinematic music video, bold contrast, anamorphic lens flare",
    color_palette: ["#0F172A", "#F97316", "#F8FAFC"],
    motion_bias: "dolly",
    lighting_bias: "cinematic",
    sample_video_url: null
  },
  {
    id: "preset-neon-drift",
    name: "Neon Drift",
    description: "Night-drive energy with electric colors and urban motion.",
    prompt_modifier: "neon lights, city motion, chromatic bloom, rain reflections",
    color_palette: ["#1E1B4B", "#06B6D4", "#F43F5E"],
    motion_bias: "pan",
    lighting_bias: "neon",
    sample_video_url: null
  },
  {
    id: "preset-anime-storm",
    name: "Anime Storm",
    description: "Vivid cel-shaded aesthetic with kinetic motion and flat lighting.",
    prompt_modifier: "anime style, cel-shaded, bold outlines, dramatic angles",
    color_palette: ["#1a0533", "#e11d48", "#fbbf24"],
    motion_bias: "zoom",
    lighting_bias: "dramatic",
    sample_video_url: null
  },
  {
    id: "preset-ethereal-drift",
    name: "Ethereal Drift",
    description: "Soft, floaty atmosphere with pastel tones and slow, meditative pacing.",
    prompt_modifier: "ethereal, soft bokeh, pastel palette, slow pan, dreamy",
    color_palette: ["#e0e7ff", "#c4b5fd", "#fbcfe8"],
    motion_bias: "static",
    lighting_bias: "soft",
    sample_video_url: null
  },
  {
    id: "preset-retro-grain",
    name: "Retro Grain",
    description: "Warm film grain, vintage color grading, and analog energy.",
    prompt_modifier: "film grain, 35mm, vintage color grade, golden hour",
    color_palette: ["#78350f", "#d97706", "#fef3c7"],
    motion_bias: "pan",
    lighting_bias: "natural",
    sample_video_url: null
  },
  {
    id: "preset-documentary",
    name: "Documentary",
    description: "Raw, handheld realism with natural light and intimate framing.",
    prompt_modifier: "handheld camera, documentary realism, natural lighting, close-up detail",
    color_palette: ["#1c1917", "#78716c", "#e7e5e4"],
    motion_bias: "tilt",
    lighting_bias: "natural",
    sample_video_url: null
  }
];

function makeScenes(count, jobId, statusFn) {
  return Array.from({ length: count }, (_, i) => ({
    id: `scene-${jobId}-${i}`,
    job_id: jobId,
    scene_index: i,
    start_time_seconds: i * 5,
    end_time_seconds: i === count - 1 ? count * 5 : (i + 1) * 5,
    duration_seconds: 5,
    visual_prompt: [
      "Establishing wide shot of a rain-soaked rooftop, city lights blurring below, slow dolly in.",
      "Close-up of hands on piano keys, dramatic backlighting, shallow depth of field.",
      "Crowd of silhouettes lit by a blazing stage light, kinetic energy, upward pan.",
      "Abstract light trails spiraling outward, extreme close-up, neon atmosphere.",
      "Artist walking through an empty warehouse corridor, long focal length compression.",
      "Aerial shot of city grid at night, time-lapse-style, electric pulse through streets.",
      "Breaking glass slow-motion, particles catching orange glow, zero gravity.",
      "Underwater dreamscape, fabric floating, golden particles, upward camera drift.",
      "Cut to black. Single spotlight on performer, cinematic reveal, full emotion.",
    ][i % 9],
    motion_type: ["dolly", "pan", "zoom", "static", "tilt"][i % 5],
    lighting_style: ["cinematic", "neon", "dramatic", "soft", "natural"][i % 5],
    color_palette: [["#0F172A", "#F97316", "#F8FAFC"], ["#1E1B4B", "#06B6D4", "#F43F5E"], ["#1a0533", "#e11d48", "#fbbf24"]][i % 3],
    mood: ["energetic", "dramatic", "calm", "playful", "mysterious"][i % 5],
    camera_angle: ["wide", "close_up", "medium", "overhead", "low_angle"][i % 5],
    beat_importance_score: +(0.5 + (i % 3) * 0.15).toFixed(2),
    bar_start_beat_index: i * 4,
    bar_end_beat_index: (i + 1) * 4,
    status: statusFn(i),
    video_model_used: statusFn(i) === "complete" ? "mock-kling" : null,
    video_url: statusFn(i) === "complete" ? `/media/mock/scene-${i}.mp4` : null,
    cost_usd: statusFn(i) === "complete" ? 0.15 : null,
    render_time_seconds: statusFn(i) === "complete" ? 2.5 : null,
    regeneration_count: 0,
    regeneration_reason: null,
    created_at: "2026-03-14T10:00:00Z",
    updated_at: "2026-03-14T10:00:00Z"
  }));
}

const SHARED_ANALYSIS = {
  bpm: 128,
  beats: Array.from({ length: 180 }, (_, i) => +(i * 0.469).toFixed(3)),
  mood: "energetic",
  energy_arc: [
    { time: 0, label: "intro", energy: 0.42 },
    { time: 22, label: "build", energy: 0.68 },
    { time: 45, label: "drop", energy: 0.95 },
    { time: 68, label: "resolve", energy: 0.55 }
  ],
  key: "C Minor",
  genre: "electronic"
};

function makeStoryboard(count, duration) {
  const scenes = makeScenes(count, "storyboard-tmp", () => "pending");
  return {
    narrative_arc: "A rising city-at-night performance journey that escalates from restrained intimacy into raw kinetic energy, resolving with a singular cinematic moment.",
    dominant_mood: "energetic",
    quality_score: 8.4,
    total_duration_seconds: duration,
    scenes: scenes.map(s => ({
      scene_index: s.scene_index,
      start_time_seconds: s.start_time_seconds,
      end_time_seconds: s.end_time_seconds,
      duration_seconds: s.duration_seconds,
      visual_description: s.visual_prompt,
      motion_type: s.motion_type,
      lighting_style: s.lighting_style,
      color_palette: s.color_palette,
      mood: s.mood,
      camera_angle: s.camera_angle,
      beat_importance_score: s.beat_importance_score,
      bar_start_beat_index: s.bar_start_beat_index,
      bar_end_beat_index: s.bar_end_beat_index,
      transition_type: "cut"
    }))
  };
}

export const mockJobs = [
  /* ── Job 1: awaiting_approval ─────────────────────────────────── */
  {
    id: "job-demo-1",
    user_id: "demo-user",
    audio_file_name: "summer-vault.mp3",
    audio_url: "/media/mock/summer-vault.mp3",
    audio_duration_seconds: 45,
    status: "awaiting_approval",
    current_stage: "approval",
    scenes_total: 9,
    scenes_completed: 0,
    scenes_failed: 0,
    created_at: "2026-03-14T10:00:00Z",
    updated_at: "2026-03-14T10:03:20Z",
    completed_at: null,
    prompt_template_version: "1.0",
    storyboard_approved: false,
    storyboard_approved_at: null,
    storyboard_rejection_reason: null,
    storyboard_regeneration_count: 0,
    estimated_cost_usd: 1.47,
    actual_cost_usd: null,
    cost_cap_usd: 20,
    final_video_url: null,
    preview_video_url: null,
    thumbnail_url: null,
    failure_reason: null,
    audio_analysis: SHARED_ANALYSIS,
    storyboard: makeStoryboard(9, 45),
    scenes: makeScenes(9, "job-demo-1", () => "pending")
  },

  /* ── Job 2: rendering (5/9 scenes complete, preview ready) ───── */
  {
    id: "job-demo-2",
    user_id: "demo-user",
    audio_file_name: "night-cruising.wav",
    audio_url: "/media/mock/night-cruising.wav",
    audio_duration_seconds: 60,
    status: "rendering",
    current_stage: "rendering",
    scenes_total: 12,
    scenes_completed: 5,
    scenes_failed: 0,
    created_at: "2026-03-14T08:00:00Z",
    updated_at: "2026-03-14T08:22:00Z",
    completed_at: null,
    prompt_template_version: "1.0",
    storyboard_approved: true,
    storyboard_approved_at: "2026-03-14T08:15:00Z",
    storyboard_rejection_reason: null,
    storyboard_regeneration_count: 0,
    estimated_cost_usd: 1.92,
    actual_cost_usd: 0.75,
    cost_cap_usd: 20,
    final_video_url: null,
    preview_video_url: "/media/mock/preview.mp4",
    thumbnail_url: null,
    failure_reason: null,
    audio_analysis: { ...SHARED_ANALYSIS, bpm: 110, mood: "dramatic", key: "A Minor", genre: "synthwave" },
    storyboard: makeStoryboard(12, 60),
    scenes: makeScenes(12, "job-demo-2", (i) => i < 5 ? "complete" : i === 5 ? "rendering" : "pending")
  },

  /* ── Job 3: complete ──────────────────────────────────────────── */
  {
    id: "job-demo-3",
    user_id: "demo-user",
    audio_file_name: "ghost-frequency.flac",
    audio_url: "/media/mock/ghost-frequency.flac",
    audio_duration_seconds: 30,
    status: "complete",
    current_stage: "done",
    scenes_total: 6,
    scenes_completed: 6,
    scenes_failed: 0,
    created_at: "2026-03-13T18:00:00Z",
    updated_at: "2026-03-13T18:35:00Z",
    completed_at: "2026-03-13T18:35:00Z",
    prompt_template_version: "1.0",
    storyboard_approved: true,
    storyboard_approved_at: "2026-03-13T18:05:00Z",
    storyboard_rejection_reason: null,
    storyboard_regeneration_count: 0,
    estimated_cost_usd: 1.02,
    actual_cost_usd: 0.98,
    cost_cap_usd: 20,
    final_video_url: "/media/mock/final.mp4",
    preview_video_url: "/media/mock/preview.mp4",
    thumbnail_url: null,
    failure_reason: null,
    audio_analysis: { ...SHARED_ANALYSIS, bpm: 96, mood: "mysterious", key: "F# Minor", genre: "ambient" },
    storyboard: makeStoryboard(6, 30),
    scenes: makeScenes(6, "job-demo-3", () => "complete")
  },

  /* ── Job 4: failed ────────────────────────────────────────────── */
  {
    id: "job-demo-4",
    user_id: "demo-user",
    audio_file_name: "corrupt-sample.mp3",
    audio_url: "/media/mock/corrupt-sample.mp3",
    audio_duration_seconds: 90,
    status: "failed",
    current_stage: "rendering",
    scenes_total: 18,
    scenes_completed: 3,
    scenes_failed: 2,
    created_at: "2026-03-13T12:00:00Z",
    updated_at: "2026-03-13T12:45:00Z",
    completed_at: null,
    prompt_template_version: "1.0",
    storyboard_approved: true,
    storyboard_approved_at: "2026-03-13T12:10:00Z",
    storyboard_rejection_reason: null,
    storyboard_regeneration_count: 0,
    estimated_cost_usd: 2.82,
    actual_cost_usd: 0.45,
    cost_cap_usd: 20,
    final_video_url: null,
    preview_video_url: null,
    thumbnail_url: null,
    failure_reason: "Provider timeout: Kling API failed to respond after 3 retries on scene 6.",
    audio_analysis: { ...SHARED_ANALYSIS, bpm: 150, mood: "aggressive", key: "D Minor", genre: "drum & bass" },
    storyboard: makeStoryboard(18, 90),
    scenes: makeScenes(18, "job-demo-4", (i) => i < 3 ? "complete" : i === 3 || i === 4 ? "failed" : "pending")
  }
];
