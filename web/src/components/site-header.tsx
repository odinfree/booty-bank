export default function SiteHeader() {
  return (
    <header className="site-header">
      <a className="site-wordmark" href="/" aria-label="Booty Bank home">
        <img src="/brand/bootybank-mark-cream.svg" alt="" width="20" height="20" />
        <span>BOOTY BANK</span>
      </a>
      <nav aria-label="Primary navigation"><a href="/app/">ACCOUNT</a><a href="/credit/">CREDIT</a><a href="/privacy/">PRIVACY</a><a href="/#waitlist">WAITLIST</a></nav>
      <span className="site-status"><i /> WORKING PROTOTYPE</span>
    </header>
  );
}
