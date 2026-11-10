"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, ExternalLink, LogOut, Plus, Save, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/api";

type User = { id: string; email: string; username: string; displayName: string; role: "USER" | "ADMIN" };
type Project = { id: string; title: string; slug: string; summary: string | null; description: string | null; visibility: "PRIVATE" | "PUBLIC"; sortOrder: number; publishedAt: string | null; coverAssetId?: string | null };
type Portfolio = { id: string; title: string; headline: string | null; biography: string | null; location: string | null; websiteUrl: string | null; visibility: "PRIVATE" | "PUBLIC"; publishedAt: string | null };

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectSummary, setProjectSummary] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const me = await apiRequest<{ user: User }>("/auth/me");
        const results = await Promise.all([
          apiRequest<{ portfolio: Portfolio }>("/portfolios/me"),
          apiRequest<{ projects: Project[] }>("/projects?limit=50&sort=newest")
        ]);
        if (!active) return;
        setUser(me.user);
        setPortfolio(results[0].portfolio);
        setProjects(results[1].projects);
      } catch (cause) {
        if (!active) return;
        const message = cause instanceof Error ? cause.message : "Unable to load your workspace.";
        if (message.toLowerCase().includes("sign in")) {
          window.location.replace("/login");
          return;
        }
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function savePortfolio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!portfolio) return;
    setBusy(true); setError(""); setNotice("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiRequest<{ portfolio: Portfolio }>("/portfolios/me", {
        method: "PATCH",
        body: JSON.stringify({
          title: form.get("title"),
          headline: form.get("headline") || null,
          biography: form.get("biography") || null,
          location: form.get("location") || null,
          websiteUrl: form.get("websiteUrl") || null
        })
      });
      setPortfolio(result.portfolio);
      setNotice("Portfolio details saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save portfolio.");
    } finally { setBusy(false); }
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await apiRequest<{ project: Project }>("/projects", {
        method: "POST",
        body: JSON.stringify({ title: projectTitle, summary: projectSummary || undefined })
      });
      setProjects((current) => [result.project, ...current]);
      setProjectTitle(""); setProjectSummary("");
      setNotice("Project created.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create project.");
    } finally { setBusy(false); }
  }

  async function toggleProject(project: Project) {
    setError(""); setNotice("");
    try {
      const result = await apiRequest<{ project: Project }>("/projects/" + project.id, {
        method: "PATCH",
        body: JSON.stringify({ visibility: project.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC" })
      });
      setProjects((current) => current.map((item) => item.id === project.id ? result.project : item));
      setNotice(result.project.visibility === "PUBLIC" ? "Project published." : "Project made private.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update project.");
    }
  }

  async function deleteProject(project: Project) {
    if (!window.confirm("Delete “" + project.title + "”? This cannot be undone.")) return;
    try {
      await apiRequest<void>("/projects/" + project.id, { method: "DELETE" });
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setNotice("Project deleted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete project.");
    }
  }


  async function uploadProjectCover(project: Project, file: File) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
    if (!allowed.includes(file.type)) { setError("Choose a JPG, PNG, WebP, AVIF or GIF image."); return; }
    if (file.size > 20 * 1024 * 1024) { setError("Cover images must be 20 MB or smaller."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const signed = await apiRequest<{ asset: { id: string }; uploadUrl: string }>("/assets/presign", {
        method: "POST",
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, sizeBytes: file.size, projectId: project.id })
      });
      const upload = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file
      });
      if (!upload.ok) throw new Error("The file could not be uploaded to storage.");
      await apiRequest("/assets/" + signed.asset.id + "/complete", { method: "POST" });
      const updated = await apiRequest<{ project: Project }>("/projects/" + project.id, {
        method: "PATCH",
        body: JSON.stringify({ coverAssetId: signed.asset.id })
      });
      setProjects((current) => current.map((item) => item.id === project.id ? updated.project : item));
      setNotice("Project cover uploaded.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload project cover.");
    } finally { setBusy(false); }
  }

  async function togglePortfolio() {
    if (!portfolio) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const path = portfolio.visibility === "PUBLIC" ? "/portfolios/unpublish" : "/portfolios/publish";
      const result = await apiRequest<{ portfolio: Portfolio }>(path, { method: "POST" });
      setPortfolio(result.portfolio);
      setNotice(result.portfolio.visibility === "PUBLIC" ? "Your portfolio is now public." : "Your portfolio is private.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to change publishing status.");
    } finally { setBusy(false); }
  }

  async function logout() {
    try { await apiRequest<void>("/auth/logout", { method: "POST" }); }
    finally { window.location.assign("/"); }
  }

  if (loading) return <main className="dashboard-loading"><span className="eyebrow">PORTOPEDIA / WORKSPACE</span><p>Opening your workspace…</p></main>;

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Link className="wordmark" href="/">porto<span>pedia</span><b>.</b></Link>
        <div className="dashboard-user"><span>{user?.displayName}</span>{user?.role === "ADMIN" && <Link href="/admin">Admin</Link>}<button className="icon-button" type="button" onClick={logout} aria-label="Sign out"><LogOut size={17} /></button></div>
      </header>
      <section className="dashboard-intro">
        <div><p className="eyebrow">CREATOR WORKSPACE / @{user?.username}</p><h1>YOUR WORK.<br /><em>YOUR SPACE.</em></h1></div>
        <div className="publish-panel">
          <span className={portfolio?.visibility === "PUBLIC" ? "status-dot is-public" : "status-dot"} />
          <div><strong>{portfolio?.visibility === "PUBLIC" ? "Portfolio is public" : "Portfolio is private"}</strong><p>{portfolio?.visibility === "PUBLIC" ? "Your published work can be discovered." : "Only you can see your workspace."}</p></div>
          <button className="button-primary" type="button" onClick={togglePortfolio} disabled={busy}>{portfolio?.visibility === "PUBLIC" ? "Unpublish" : "Publish"} <ArrowUpRight size={15} /></button>
        </div>
      </section>

      {(notice || error) && <p className={error ? "dashboard-alert is-error" : "dashboard-alert"} role="status">{error || notice}</p>}

      <div className="dashboard-grid">
        <section className="dashboard-card">
          <div className="dashboard-card-heading"><div><p className="eyebrow">01 / PROFILE</p><h2>Your introduction.</h2></div><Save size={20} /></div>
          {portfolio && <form className="dashboard-form" onSubmit={savePortfolio}>
            <label htmlFor="title">Portfolio title</label><input id="title" name="title" defaultValue={portfolio.title} maxLength={100} required />
            <label htmlFor="headline">Headline</label><input id="headline" name="headline" defaultValue={portfolio.headline ?? ""} maxLength={160} placeholder="What do you do?" />
            <label htmlFor="biography">About you</label><textarea id="biography" name="biography" defaultValue={portfolio.biography ?? ""} maxLength={5000} rows={5} placeholder="Tell people about your work and approach." />
            <div className="form-two-col"><div><label htmlFor="location">Location</label><input id="location" name="location" defaultValue={portfolio.location ?? ""} maxLength={120} /></div><div><label htmlFor="websiteUrl">Website</label><input id="websiteUrl" name="websiteUrl" type="url" defaultValue={portfolio.websiteUrl ?? ""} placeholder="https://" /></div></div>
            <button className="button-primary" type="submit" disabled={busy}>Save profile <Save size={15} /></button>
          </form>}
        </section>

        <section className="dashboard-card projects-card">
          <div className="dashboard-card-heading"><div><p className="eyebrow">02 / SELECTED WORK</p><h2>Build your projects.</h2></div><span className="project-count">{projects.length.toString().padStart(2, "0")}</span></div>
          <form className="project-create-form" onSubmit={createProject}>
            <label htmlFor="projectTitle">New project title</label>
            <input id="projectTitle" value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} minLength={2} maxLength={120} required placeholder="Give the work a name" />
            <label htmlFor="projectSummary">Short description</label>
            <textarea id="projectSummary" value={projectSummary} onChange={(event) => setProjectSummary(event.target.value)} maxLength={500} rows={2} placeholder="What is this project about?" />
            <button className="button-primary" type="submit" disabled={busy}><Plus size={16} /> Add project</button>
          </form>
          <div className="project-list">
            {projects.length === 0 ? <div className="empty-state"><span>NO PROJECTS YET</span><p>Your first project will appear here after you create it.</p></div> : projects.map((project) => (
              <article className="project-row" key={project.id}>
                <div className="project-row-main"><strong>{project.title}</strong><p>{project.summary || "No description yet."}</p><span>{project.visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE"}</span></div>
                <div className="project-row-actions">
                  <button type="button" onClick={() => toggleProject(project)}>{project.visibility === "PUBLIC" ? "Make private" : "Publish"}</button>
                  <button type="button" className="danger-action" onClick={() => deleteProject(project)} aria-label={"Delete " + project.title}><Trash2 size={15} /></button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
      <footer className="dashboard-footer"><span>PORTOPEDIA / INDEPENDENT BY DESIGN</span>{portfolio?.visibility === "PUBLIC" && <Link href={"/u/" + user?.username} target="_blank">View your public portfolio <ExternalLink size={14} /></Link>}</footer>
    </main>
  );
}
