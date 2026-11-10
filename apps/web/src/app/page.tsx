import { ArrowDownRight, ArrowUpRight, Asterisk, Layers3, ScanFace, Sparkles } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import Link from "next/link";

const capabilities = [
  {
    number: "01",
    icon: Layers3,
    title: "A portfolio that feels like you.",
    description: "Bring selected projects, images, and the story behind your work into one clear, considered space."
  },
  {
    number: "02",
    icon: ScanFace,
    title: "Your identity. Your address.",
    description: "Shape a recognizable creator profile and publish a portfolio that is easy to share."
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Built for the work.",
    description: "A focused publishing experience that keeps the work in front and the interface out of its way."
  }
];

export default function HomePage() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Portopedia home">porto<span>pedia</span><b>.</b></a>
        <nav className="nav-links" aria-label="Main navigation">
          <a href="#about">About</a>
          <a href="#features">Platform</a>
          <Link href="/login">Sign in</Link>
          <ThemeToggle />
          <Link className="nav-cta" href="/register">Get started <ArrowUpRight size={14} aria-hidden="true" /></Link>
        </nav>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div>
          <p className="eyebrow">The independent creator platform / 001</p>
          <h1 id="hero-title">MAKE WORK.<br /><em>MAKE</em> A MARK.</h1>
          <div className="hero-actions">
            <Link className="button-primary" href="/register">Build your portfolio <ArrowUpRight size={16} aria-hidden="true" /></Link>
            <a className="button-secondary" href="#features">Explore the platform <ArrowDownRight size={16} aria-hidden="true" /></a>
          </div>
        </div>
        <p className="hero-copy">Your work deserves more than a folder of links. Portopedia gives independent creators a place to show what they do, tell their story, and put their best work forward.</p>
      </section>

      <div className="ticker" aria-label="For people who make things">
        <span>DESIGNERS</span><b>✳</b><span>ARTISTS</span><b>✳</b><span>PHOTOGRAPHERS</span><b>✳</b><span>DEVELOPERS</span><b>✳</b><span>MAKERS</span><b>✳</b><span>INDEPENDENT BY DESIGN</span>
      </div>

      <section className="section" id="features" aria-labelledby="features-title">
        <div className="section-heading">
          <div><p className="eyebrow">Less noise. More signal.</p><h2 id="features-title">A better home<br />for your work.</h2></div>
          <p>Everything starts with a simple idea: the work should speak first. The tools around it should make that easier.</p>
        </div>
        <div className="feature-grid">
          {capabilities.map(({ number, icon: Icon, title, description }) => (
            <article className="feature-card" key={number}>
              <div className="feature-number">{number} / <Icon size={18} aria-hidden="true" /></div>
              <div><h3>{title}</h3><p>{description}</p></div>
              <div className="feature-mark" aria-hidden="true"><Asterisk size={25} strokeWidth={3} /></div>
            </article>
          ))}
        </div>
      </section>

      <section className="manifesto" id="about">
        <div className="manifesto-inner">
          <p className="eyebrow">The Portopedia point of view</p>
          <h2>GOOD WORK<br />SHOULD NOT<br />GET LOST.</h2>
        </div>
      </section>

      <section className="section" id="get-started">
        <div className="section-heading">
          <div><p className="eyebrow">Your next chapter starts here</p><h2>Make it<br />public.</h2></div>
          <p>Create your account, shape your profile, add selected projects, and publish a public portfolio you can share with the world.</p>
        </div>
        <Link className="button-primary" href="/register">Create your portfolio <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </section>

      <footer className="site-footer">
        <a className="wordmark" href="/">porto<span>pedia</span><b>.</b></a>
        <span>© {new Date().getFullYear()} Portopedia. Made for people who make things.</span>
        <span>Independent by design.</span>
      </footer>
    </main>
  );
}
