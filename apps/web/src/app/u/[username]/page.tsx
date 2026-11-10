import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type PublicProject = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  description: string | null;
  publishedAt: string | null;
};

type PublicPortfolio = {
  title: string;
  headline: string | null;
  biography: string | null;
  location: string | null;
  websiteUrl: string | null;
  user: { username: string; displayName: string };
  projects: PublicProject[];
};

async function getPortfolio(username: string): Promise<PublicPortfolio | null> {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
  const response = await fetch(apiUrl + "/api/v1/portfolios/" + encodeURIComponent(username), {
    next: { revalidate: 60 }
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Unable to load this portfolio.");
  const result = await response.json() as { portfolio: PublicPortfolio };
  return result.portfolio;
}

type PageProps = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const portfolio = await getPortfolio(username);
  if (!portfolio) return { title: "Portfolio not found" };
  return {
    title: portfolio.title,
    description: portfolio.headline || portfolio.biography || "A creator portfolio on Portopedia.",
    openGraph: { title: portfolio.title, description: portfolio.headline || portfolio.biography || "A creator portfolio on Portopedia." }
  };
}

export default async function PublicPortfolioPage({ params }: PageProps) {
  const { username } = await params;
  const portfolio = await getPortfolio(username);
  if (!portfolio) notFound();

  return (
    <main className="public-portfolio">
      <header className="public-header">
        <Link className="wordmark" href="/">porto<span>pedia</span><b>.</b></Link>
        <span className="eyebrow">CREATOR PORTFOLIO / @{portfolio.user.username}</span>
      </header>
      <section className="public-hero">
        <p className="eyebrow">{portfolio.location || "INDEPENDENT CREATOR"}</p>
        <h1>{portfolio.title.toUpperCase()}</h1>
        {portfolio.headline && <p className="public-headline">{portfolio.headline}</p>}
        {portfolio.biography && <p className="public-bio">{portfolio.biography}</p>}
        <div className="public-identity">
          <strong>{portfolio.user.displayName}</strong>
          {portfolio.websiteUrl && <a href={portfolio.websiteUrl} target="_blank" rel="noreferrer">Website <ArrowUpRight size={14} /></a>}
        </div>
      </section>
      <section className="public-work">
        <div className="public-work-heading"><p className="eyebrow">SELECTED WORK / {String(portfolio.projects.length).padStart(2, "0")}</p><h2>PROJECTS.</h2></div>
        {portfolio.projects.length === 0 ? <p className="public-empty">This creator has not published any projects yet.</p> : (
          <div className="public-project-grid">
            {portfolio.projects.map((project, index) => (
              <article className="public-project" key={project.id}>
                <span className="public-project-index">{String(index + 1).padStart(2, "0")} / PORTOPEDIA</span>
                {project.coverUrl && <div className="public-project-cover" role="img" aria-label={project.title + " cover image"} style={{ backgroundImage: "url(" + project.coverUrl + ")" }} />}\n                <h3>{project.title}</h3>
                {project.summary && <p>{project.summary}</p>}
                {project.description && <p className="public-project-description">{project.description}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
      <footer className="public-footer"><Link className="wordmark" href="/">porto<span>pedia</span><b>.</b></Link><span>MADE FOR PEOPLE WHO MAKE THINGS.</span></footer>
    </main>
  );
}
