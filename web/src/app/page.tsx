import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import WaitlistForm from "../components/waitlist-form";

const files = [
  { number: "01", title: "ACCOUNT", copy: "ONE ACCOUNT.", href: "/app/", className: "file-blue", cta: "OPEN ACCOUNT" },
  { number: "02", title: "CREDIT", copy: "INCOME TO CREDIT.", href: "/credit/", className: "file-green", cta: "OPEN CREDIT" },
  { number: "03", title: "PRIVACY", copy: "NO PUBLIC PROFILE.", href: "/privacy/", className: "file-purple", cta: "OPEN PRIVACY" },
];

export default function Home() {
  return (
    <main className="mosby-site">
      <SiteHeader />
      <section className="mosby-hero" aria-labelledby="hero-title">
        <div className="hero-title-block">
          <h1 id="hero-title">BOOTY<br />BANK</h1>
        </div>
        <div className="hero-bottomline"><p>BORROW AGAINST YOUR BBL.</p><span className="hero-status"><i /> WORKING PROTOTYPE</span></div>
      </section>

      <section className="pq-declaration" aria-labelledby="pq-title">
        <div><span>FALCON-512 CONTRACT / 28 TESTS</span><b>POST-QUANTUM READY</b></div>
        <h2 id="pq-title">POST-QUANTUM<br />READY.</h2>
        <div className="pq-declaration-foot"><p>PRIVATE INCOME.<br />MINIMUM DISCLOSURE.</p><a href="/privacy/">OPEN SECURITY FILE <span>↗</span></a></div>
      </section>

      <section className="file-cabinet" aria-label="Booty Bank product files">
        {files.map((file) => (
          <a className={`file-layer ${file.className}`} href={file.href} key={file.title}>
            <span className="file-tab">{file.number} / {file.title}</span>
            <span className="file-copy">{file.copy}</span>
            <strong>{file.cta} ↗</strong>
          </a>
        ))}
        <section className="file-layer file-red file-waitlist" id="waitlist" aria-labelledby="waitlist-title">
          <span className="file-tab">04 / PRIVATE BETA</span>
          <div className="waitlist-dossier">
            <div><h2 id="waitlist-title">GET IN<br />EARLY.</h2></div>
            <WaitlistForm />
          </div>
        </section>
      </section>

      <SiteFooter />
    </main>
  );
}
