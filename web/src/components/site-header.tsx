export default function SiteHeader({ dark = true }: { dark?: boolean }) {
  return (
    <header className={`site-header ${dark ? "site-header-dark" : ""}`}>
      <a className="site-wordmark" href="/">BOOTY BANK</a>
      <nav aria-label="Primary navigation"><a href="/app/">ACCOUNT</a><a href="/credit/">CREDIT</a><a href="/privacy/">PRIVACY</a><a href="/#waitlist">WAITLIST</a></nav>
      <span className="site-status"><i /> PROTOTYPE / LIVE</span>
    </header>
  );
}
