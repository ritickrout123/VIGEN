"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { register, USE_MOCKS } from "../../lib/api.js";
import { setStoredSession } from "../../lib/auth.js";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", username: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");
    try {
      const session = await register({ email: form.email, username: form.username, password: form.password });
      setStoredSession(session);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleMockRegister() {
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
          <p className="vg-eyebrow">Create account</p>
          <h1 style={{ marginBottom: "6px" }}>Join VIGEN</h1>
          <p className="vg-secondary" style={{ marginBottom: "28px" }}>Start generating music videos in minutes.</p>

          <form className="vg-form" onSubmit={handleSubmit}>
            <div className="vg-field">
              <label className="vg-label" htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" required placeholder="you@example.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="vg-field">
              <label className="vg-label" htmlFor="username">Username</label>
              <input id="username" type="text" autoComplete="username" required minLength={3} placeholder="yourname"
                value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div className="vg-field">
              <label className="vg-label" htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete="new-password" required minLength={8} placeholder="Min 8 characters"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="vg-field">
              <label className="vg-label" htmlFor="confirm">Confirm password</label>
              <input id="confirm" type="password" autoComplete="new-password" required placeholder="Repeat password"
                value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
            </div>
            {error && <p className="vg-error">⚠ {error}</p>}
            <button className="vg-btn" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          {USE_MOCKS && (
            <>
              <div className="vg-divider" style={{ margin: "20px 0" }} />
              <button className="vg-btn-secondary" type="button" style={{ width: "100%" }} onClick={handleMockRegister}>
                ⚡ Mock register — skip to dashboard
              </button>
            </>
          )}

          <p className="vg-small vg-secondary" style={{ textAlign: "center", marginTop: "24px" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--purple)" }}>Log in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
