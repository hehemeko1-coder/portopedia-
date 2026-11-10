"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiRequest<{ message: string }>("/auth/password-reset/request", {
        method: "POST", body: JSON.stringify({ email })
      });
      setMessage(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to request a password reset.");
    } finally { setBusy(false); }
  }

  return (
    <main className="auth-page">
      <header className="auth-header"><Link className="wordmark" href="/">porto<span>pedia</span><b>.</b></Link><span className="eyebrow">ACCOUNT RECOVERY</span></header>
      <section className="auth-panel">
        <p className="eyebrow">GET BACK INTO YOUR WORK</p><h1>RESET<br />PASSWORD.</h1>
        <p className="auth-intro">Enter the email address associated with your account. If it exists, we will send a reset link.</p>
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="recovery-email">Email address</label>
          <input id="recovery-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <button className="button-primary auth-submit" type="submit" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
        </form>
        <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
      </section>
    </main>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (password !== confirm) { setError("The passwords do not match."); return; }
    setBusy(true);
    try {
      const result = await apiRequest<{ message: string }>("/auth/password-reset/confirm", {
        method: "POST", body: JSON.stringify({ token, password })
      });
      setMessage(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reset your password.");
    } finally { setBusy(false); }
  }

  return (
    <main className="auth-page">
      <header className="auth-header"><Link className="wordmark" href="/">porto<span>pedia</span><b>.</b></Link><span className="eyebrow">ACCOUNT RECOVERY</span></header>
      <section className="auth-panel">
        <p className="eyebrow">CHOOSE A NEW PASSWORD</p><h1>START<br />FRESH.</h1>
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="new-password">New password</label>
          <input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} />
          <label htmlFor="confirm-password">Confirm password</label>
          <input id="confirm-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <button className="button-primary auth-submit" type="submit" disabled={busy || Boolean(message)}>{busy ? "Updating…" : "Update password"}</button>
        </form>
        {message && <p className="auth-switch"><Link href="/login">Sign in with your new password</Link></p>}
      </section>
    </main>
  );
}
