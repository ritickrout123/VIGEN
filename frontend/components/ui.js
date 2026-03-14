import Link from "next/link";

import { h } from "../lib/h.js";

export function Shell({ children }) {
  return h("div", { className: "shell" }, children);
}

export function Topbar() {
  return h(
    "header",
    { className: "topbar shell" },
    h(Link, { href: "/", className: "brand" }, "VIGEN"),
    h(
      "nav",
      { className: "nav-links" },
      h(Link, { href: "/dashboard" }, "Dashboard"),
      h(Link, { href: "/create" }, "Create"),
      h(Link, { href: "/login" }, "Login")
    )
  );
}

export function Card({ children, className = "" }) {
  return h("section", { className: `card ${className}`.trim() }, children);
}

export function StatusBadge({ value }) {
  return h("span", { className: "status" }, value || "unknown");
}

export function ProgressBar({ value }) {
  return h(
    "div",
    { className: "progress", "aria-label": "progress" },
    h("span", { style: { width: `${Math.max(0, Math.min(100, value || 0))}%` } })
  );
}

export function ActionLink({ href, children, secondary = false }) {
  return h(Link, { href, className: secondary ? "btn-secondary" : "btn" }, children);
}

export function EmptyState({ title, body }) {
  return h(
    "div",
    { className: "empty" },
    h("strong", null, title),
    h("p", { className: "small muted" }, body)
  );
}

