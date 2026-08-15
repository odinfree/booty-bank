import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import WaitlistForm from "../components/waitlist-form";

const files = [
  { number: "01", title: "ACCOUNT", copy: "SPEND, SEND, EXCHANGE, SAVE, AND CONTROL EVERY PAYOUT FROM ONE PRIVATE ACCOUNT.", href: "/app/", className: "file-blue", cta: "OPEN THE ACCOUNT" },
  { number: "02", title: "CREDIT", copy: "TURN CONSENTED CREATOR INCOME INTO A MINIMAL LENDER PACKET. NO PUBLIC HANDLE. NO PUBLIC PAYOUT HISTORY.", href: "/credit/", className: "file-green", cta: "BUILD A CREDIT FILE" },
  { number: "03", title: "PRIVACY", copy: "SEPARATE IDENTITY, INCOME, AUTHORIZATION, AND DISCLOSURE—WITH A FALCON-512 STARKNET ACCOUNT.", href: "/privacy/", className: "file-purple", cta: "READ THE SECURITY FILE" },
];

export default function Home() {
  return (
    <main className="mosby-site">
      <SiteHeader />
      <section className="mosby-hero" aria-labelledby="hero-title">
        <div className="hero-register"><span>FILE / 0001</span><span>18+ CREATOR FINANCE</span><span>WORKING PROTOTYPE</span></div>
        <p className="mosby-kicker">THE PRIMARY MONEY ACCOUNT FOR ONLYFANS CREATORS</p>
        <h1 id="hero-title">BOOTY<br />BANK</h1>
        <div className="hero-bottomline"><p>BORROW AGAINST YOUR BBL.</p><a href="/app/">ENTER THE ACCOUNT <span>↗</span></a></div>
      </section>

      <section className="file-cabinet" aria-label="Booty Bank product files">
        {files.map((file) => (
          <a className={`file-layer ${file.className}`} href={file.href} key={file.title}>
            <span className="file-tab">{file.number} / {file.title}</span>
            <span className="file-number">{file.number}</span>
            <span className="file-copy">{file.copy}</span>
            <strong>{file.cta} ↗</strong>
          </a>
        ))}
        <section className="file-layer file-red file-waitlist" id="waitlist" aria-labelledby="waitlist-title">
          <span className="file-tab">04 / PRIVATE BETA</span>
          <div className="waitlist-dossier">
            <div><span>INVITATION FILE / 2026</span><h2 id="waitlist-title">GET IN<br />EARLY.</h2></div>
            <WaitlistForm />
          </div>
        </section>
      </section>

      <section className="trust-strip" aria-label="Prototype status"><span>NOT A BANK</span><span>NO FUNDS MOVE</span><span>SAMPLE DATA</span><span>NOT AFFILIATED WITH ONLYFANS</span></section>
      <SiteFooter />
    </main>
  );
}
