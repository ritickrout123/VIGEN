"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { h } from "../../lib/h.js";
import { login } from "../../lib/api.js";
import { setStoredSession } from "../../lib/auth.js";
import { Card, Shell } from "../../components/ui.js";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await login(form);
      setStoredSession(session);
      router.push("/dashboard");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return h(
    Shell,
    null,
    h(
      "main",
      { className: "page-grid" },
      h(
        Card,
        null,
        h("div", { className: "kicker" }, "Welcome back"),
        h("h1", null, "Log in"),
        h("form", { className: "form-grid", onSubmit: handleSubmit },
          h("label", { className: "field" },
            h("span", null, "Email"),
            h("input", {
              type: "email",
              value: form.email,
              onChange: (event) => setForm({ ...form, email: event.target.value })
            })
          ),
          h("label", { className: "field" },
            h("span", null, "Password"),
            h("input", {
              type: "password",
              value: form.password,
              onChange: (event) => setForm({ ...form, password: event.target.value })
            })
          ),
          error ? h("p", { className: "small", style: { color: "#b91c1c" } }, error) : null,
          h("button", { className: "btn", type: "submit", disabled: loading }, loading ? "Logging in..." : "Log in")
        )
      )
    )
  );
}

