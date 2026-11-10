"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { apiRequest, googleSignInUrl } from "@/lib/api";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const isRegister = mode === "register";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await apiRequest<{ message?: string }>(isRegister ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(isRegister
          ? { email, password, username, displayName }
          : { email, password })
      });
      if (isRegister) {\n        setNotice(result.message || "Check your email to verify your account.");\n        return;\n      }\n      window.location.assign("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to complete the request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link className="wordmark" href="/">porto<span>pedia</span><b>.</b></Link>
        <span className="eyebrow">A home for independent work</span>
      </header>
      <section className="auth-panel" aria-labelledby="auth-title">
        <p className="eyebrow">{isRegister ? "Start making your mark" : "Welcome back"}</p>
        <h1 id="auth-title">{isRegister ? <>MAKE ROOM<br />FOR YOUR WORK.</> : <>GOOD TO<br />HAVE YOU BACK.</>}</h1>
        <p className="auth-intro">{isRegister ? "Create your creator account and start shaping your portfolio." : "Sign in to manage your portfolio and projects."}</p>
        <form className="auth-form" onSubmit={submit}>
          {isRegister && <>
            <label htmlFor="displayName">Display name</label>
            <input id="displayName" name="displayName" autoComplete="name" minLength={2} maxLength={80} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            <label htmlFor="username">Username</label>
            <input id="username" name="username" autoComplete="username" minLength={3} maxLength={30} pattern="[A-Za-z0-9_-]+" required value={username} onChange={(event) => setUsername(event.target.value)} />
          </>}
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 12 : 1} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} />
          {isRegister && <p className="form-hint">Use at least 12 characters.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}\n          {notice && <p className="form-success" role="status">{notice}</p>}
          <button className="button-primary auth-submit" type="submit" disabled={busy}>
            {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"} <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        </form>
        <div className="auth-divider"><span>OR</span></div>
        <a className="button-secondary auth-google" href={googleSignInUrl()}>Continue with Google <ArrowUpRight size={15} aria-hidden="true" /></a>
        {!isRegister && <p className="auth-forgot"><Link href="/forgot-password">Forgot your password?</Link></p>}\n        <p className="auth-switch">{isRegister ? "Already have an account?" : "New to Portopedia?"}{" "}<Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"}</Link></p>
      </section>
      <footer className="auth-footer"><span>PORTOPEDIA / INDEPENDENT BY DESIGN</span><Link href="/">Back to home</Link></footer>
    </main>
  );
}
