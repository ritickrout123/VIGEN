export const mockPresets = [
  {
    id: "preset-cinematic-pulse",
    name: "Cinematic Pulse",
    description: "Premium performance look with rich contrast and bold camera motion.",
    prompt_modifier: "cinematic music video, bold contrast",
    color_palette: ["#0F172A", "#F97316", "#F8FAFC"],
    motion_bias: "dolly",
    lighting_bias: "cinematic",
    sample_video_url: null
  },
  {
    id: "preset-neon-drift",
    name: "Neon Drift",
    description: "Night-drive energy with electric colors and urban motion.",
    prompt_modifier: "neon lights, city motion, chromatic bloom",
    color_palette: ["#1E1B4B", "#06B6D4", "#F43F5E"],
    motion_bias: "pan",
    lighting_bias: "neon",
    sample_video_url: null
  }
];

export const mockJobs = [
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
    updated_at: "2026-03-14T10:03:00Z",
    prompt_template_version: "1.0",
    storyboard_approved: false,
    storyboard_approved_at: null,
    storyboard_rejection_reason: null,
    storyboard_regeneration_count: 0,
    estimated_cost_usd: 1.65,
    actual_cost_usd: null,
    cost_cap_usd: 20,
    final_video_url: null,
    preview_video_url: null,
    thumbnail_url: null,
    failure_reason: null,
    completed_at: null,
    audio_analysis: {
      bpm: 120,
      beats: [0, 0.5, 1, 1.5],
      mood: "energetic",
      energy_arc: [
        { time: 0, label: "intro", energy: 0.4 },
        { time: 22, label: "lift", energy: 0.82 }
      ],
      key: "C Minor",
      genre: "electronic"
    },
    storyboard: {
      narrative_arc: "A rising city-at-night performance journey with a bright, cinematic payoff.",
      dominant_mood: "energetic",
      quality_score: 8.1,
      total_duration_seconds: 45,
      scenes: Array.from({ length: 9 }, (_, index) => ({
        scene_index: index,
        start_time_seconds: index * 5,
        end_time_seconds: index === 8 ? 45 : (index + 1) * 5,
        duration_seconds: 5,
        visual_description: `Scene ${index + 1} with neon atmosphere, expressive movement, and beat-synced framing.`,
        motion_type: index % 2 === 0 ? "dolly" : "pan",
        lighting_style: "cinematic",
        color_palette: ["#0F172A", "#F97316", "#F8FAFC"],
        mood: "energetic",
        camera_angle: "wide",
        beat_importance_score: 0.7,
        bar_start_beat_index: index * 4,
        bar_end_beat_index: (index + 1) * 4,
        transition_type: "cut"
      }))
    },
    scenes: Array.from({ length: 9 }, (_, index) => ({
      id: `scene-${index}`,
      job_id: "job-demo-1",
      scene_index: index,
      start_time_seconds: index * 5,
      end_time_seconds: index === 8 ? 45 : (index + 1) * 5,
      duration_seconds: 5,
      visual_prompt: `Scene ${index + 1} with neon atmosphere, expressive movement, and beat-synced framing.`,
      motion_type: index % 2 === 0 ? "dolly" : "pan",
      lighting_style: "cinematic",
      color_palette: ["#0F172A", "#F97316", "#F8FAFC"],
      mood: "energetic",
      camera_angle: "wide",
      beat_importance_score: 0.7,
      bar_start_beat_index: index * 4,
      bar_end_beat_index: (index + 1) * 4,
      status: "pending",
      video_model_used: null,
      video_url: null,
      cost_usd: null,
      render_time_seconds: null,
      regeneration_count: 0,
      created_at: "2026-03-14T10:00:00Z",
      updated_at: "2026-03-14T10:00:00Z"
    }))
  }
];

