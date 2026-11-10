"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Search, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/api";

type Metrics = { users: number; portfolios: number; publicPortfolios: number; projects: number; publicProjects: number; assets: number; activeSessions: number };
type AdminUser = { id: string; email: string; username: string; displayName: string; role: "USER" | "ADMIN"; emailVerifiedAt: string | null; createdAt: string };

export default function AdminPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadUsers(search = "") {
    const result = await apiRequest<{ users: AdminUser[] }>("/admin/users?limit=50&q=" + encodeURIComponent(search));
    setUsers(result.users);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await apiRequest<{ metrics: Metrics }>("/admin/overview");
        const directory = await apiRequest<{ users: AdminUser[] }>("/admin/users?limit=50");
        if (active) { setMetrics(result.metrics); setUsers(directory.users); }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load administrator tools.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function searchUsers(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { await loadUsers(query); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Search failed."); }
  }

  if (loading) return <main className="dashboard-loading"><span className="eyebrow">PORTOPEDIA / ADMIN</span><p>Loading administration…</p></main>;

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Link className="wordmark" href="/">porto<span>pedia</span><b>.</b></Link>
        <Link className="admin-back" href="/dashboard"><ArrowLeft size={15} /> Creator workspace</Link>
      </header>
      <section className="admin-intro"><p className="eyebrow">PORTOPEDIA / OPERATIONS</p><h1>CONTROL<br /><em>ROOM.</em></h1><p>Platform health, creator accounts and publishing activity.</p></section>
      {error && <p className="dashboard-alert is-error" role="alert">{error}</p>}
      {metrics && <section className="admin-metrics">
        {Object.entries({
          "CREATOR ACCOUNTS": metrics.users,
          "PORTFOLIOS": metrics.portfolios,
          "PUBLIC PORTFOLIOS": metrics.publicPortfolios,
          "PROJECTS": metrics.projects,
          "PUBLIC PROJECTS": metrics.publicProjects,
          "MEDIA ASSETS": metrics.assets,
          "ACTIVE SESSIONS": metrics.activeSessions
        }).map(([label, value]) => <article className="admin-metric" key={label}><span>{label}</span><strong>{value.toLocaleString()}</strong></article>)}
      </section>}
      <section className="admin-directory">
        <div className="dashboard-card-heading"><div><p className="eyebrow">01 / CREATOR DIRECTORY</p><h2>Accounts.</h2></div><ShieldCheck size={22} /></div>
        <form className="admin-search" onSubmit={searchUsers}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search email, username or name" aria-label="Search creator accounts" /><button className="button-primary" type="submit"><Search size={16} /> Search</button></form>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Creator</th><th>Username</th><th>Role</th><th>Email status</th><th>Joined</th></tr></thead><tbody>
          {users.map((item) => <tr key={item.id}><td><strong>{item.displayName}</strong><small>{item.email}</small></td><td>@{item.username}</td><td>{item.role}</td><td>{item.emailVerifiedAt ? "Verified" : "Unverified"}</td><td>{new Date(item.createdAt).toLocaleDateString()}</td></tr>)}
        </tbody></table></div>
        {users.length === 0 && <p className="public-empty">No matching accounts.</p>}
      </section>
    </main>
  );
}
