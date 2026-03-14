import { h } from "../lib/h.js";
import { ActionLink, Card, Shell } from "../components/ui.js";

const highlights = [
  "Storyboard approval before GPU spend",
  "Beat-aware scene planning and rendering",
  "Live progress, preview, and final delivery"
];

export default function HomePage() {
  return h(
    Shell,
    null,
    h(
      "main",
      { className: "page-grid" },
      h(
        "section",
        { className: "hero hero-grid" },
        h(
          "div",
          null,
          h("div", { className: "kicker" }, "Phase 1 MVP"),
          h("h1", { className: "headline" }, "Turn a track into a cinematic video pipeline."),
          h(
            "p",
            { className: "lede" },
            "VIGEN is built for artists and creators who need transparent, scalable music-video generation without the cost and latency of a traditional production stack."
          ),
          h(
            "div",
            { className: "actions" },
            h(ActionLink, { href: "/create" }, "Create a Job"),
            h(ActionLink, { href: "/dashboard", secondary: true }, "Open Dashboard")
          )
        ),
        h(
          Card,
          null,
          h("div", { className: "kicker" }, "What ships in Phase 1"),
          ...highlights.map((item) =>
            h("p", { key: item, className: "lede" }, item)
          )
        )
      )
    )
  );
}

