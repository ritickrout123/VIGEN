"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, USE_MOCKS } from "../../lib/api.js";
import { setStoredSession } from "../../lib/auth.js";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await login(form);
      setStoredSession(session);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  function handleMockLogin() {
    setStoredSession({
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      user: { id: "demo-user", email: "demo@vigen.app", username: "demo", role: "user", credits_balance: 250 },
    });
    router.push("/dashboard");
  }

  return (
    <div className="vg-shell">
      <main className="vg-page" style={{ maxWidth: "440px", margin: "0 auto" }}>
        <div className="vg-card">
          <p className="vg-eyebrow">Welcome back</p>
          <h1 style={{ marginBottom: "6px" }}>Log in to VIGEN</h1>
          <p className="vg-secondary" style={{ marginBottom: "28px" }}>Pick up where you left off.</p>

          <form className="vg-form" onSubmit={handleSubmit}>
            <div className="vg-field">
              <label className="vg-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="vg-field">
              <label className="vg-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            {error && <p className="vg-error">⚠ {error}</p>}
            <button className="vg-btn" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>

          {USE_MOCKS && (
            <>
              <div className="vg-divider" style={{ margin: "20px 0" }} />
              <button
                className="vg-btn-secondary"
                type="button"
                style={{ width: "100%" }}
                onClick={handleMockLogin}
              >
                ⚡ Mock login — skip to dashboard
              </button>
              <p className="vg-small vg-secondary" style={{ textAlign: "center", marginTop: "8px" }}>
                Mock mode active
              </p>
            </>
          )}

          <p className="vg-small vg-secondary" style={{ textAlign: "center", marginTop: "24px" }}>
            No account?{" "}
            <Link href="/register" style={{ color: "var(--purple)" }}>Create one free</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
