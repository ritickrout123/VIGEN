"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { login, USE_MOCKS } from "../../lib/api.js";
import { setStoredSession } from "../../lib/auth.js";
import { Card, Shell } from "../../components/ui.jsxx";

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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleMockLogin() {
    const session = {
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      user: { id: "demo-user", email: "demo@vigen.app", username: "demo", role: "user", credits_balance: 250 }
    };
    setStoredSession(session);
    router.push("/dashboard");
  }

  return (
    <Shell>
      <main className="page-grid" style={{ maxWidth: "480px", margin: "0 auto", paddingTop: "60px" }}>
        <Card>
          <div className="kicker">Welcome back</div>
          <h1 style={{ marginBottom: "6px" }}>Log in to VIGEN</h1>
          <p className="lede" style={{ marginBottom: "24px" }}>Pick up where you left off.</p>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span className="label">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="label">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            {error && <p className="error-text">{error}</p>}
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>
          {USE_MOCKS && (
            <div style={{ marginTop: "16px" }}>
              <div className="divider" />
              <button
                className="btn-secondary"
                type="button"
                style={{ width: "100%", marginTop: "12px" }}
                onClick={handleMockLogin}
              >
                ⚡ Mock login — skip to dashboard
              </button>
              <p className="small muted" style={{ textAlign: "center", marginTop: "8px" }}>
                Mock mode active — no real API call
              </p>
            </div>
          )}
          <p className="small muted" style={{ textAlign: "center", marginTop: "20px" }}>
            No account?{" "}
            <Link href="/register" style={{ color: "var(--accent)" }}>Register</Link>
          </p>
        </Card>
      </main>
    </Shell>
  );
}
