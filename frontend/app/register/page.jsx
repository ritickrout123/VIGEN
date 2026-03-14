"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { register, USE_MOCKS } from "../../lib/api.js";
import { setStoredSession } from "../../lib/auth.js";
import { Card, Shell } from "../../components/ui.jsxx";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", username: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function field(key) {
    return {
      value: form[key],
      onChange: (e) => setForm({ ...form, [key]: e.target.value })
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const session = await register({ email: form.email, username: form.username, password: form.password });
      setStoredSession(session);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleMockRegister() {
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
          <div className="kicker">Create account</div>
          <h1 style={{ marginBottom: "6px" }}>Join VIGEN</h1>
          <p className="lede" style={{ marginBottom: "24px" }}>Start generating music videos in minutes.</p>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span className="label">Email</span>
              <input type="email" autoComplete="email" required {...field("email")} />
            </label>
            <label className="field">
              <span className="label">Username</span>
              <input type="text" autoComplete="username" required minLength={3} {...field("username")} />
            </label>
            <label className="field">
              <span className="label">Password</span>
              <input type="password" autoComplete="new-password" required minLength={8} {...field("password")} />
            </label>
            <label className="field">
              <span className="label">Confirm password</span>
              <input type="password" autoComplete="new-password" required {...field("confirm")} />
            </label>
            {error && <p className="error-text">{error}</p>}
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
          {USE_MOCKS && (
            <div style={{ marginTop: "16px" }}>
              <div className="divider" />
              <button
                className="btn-secondary"
                type="button"
                style={{ width: "100%", marginTop: "12px" }}
                onClick={handleMockRegister}
              >
                ⚡ Mock register — skip to dashboard
              </button>
            </div>
          )}
          <p className="small muted" style={{ textAlign: "center", marginTop: "20px" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--accent)" }}>Log in</Link>
          </p>
        </Card>
      </main>
    </Shell>
  );
}
