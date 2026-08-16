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

      <section className="pq-declaration" aria-labelledby="case-title">
        <div><span>WHY BOOTY BANK</span><b>THREE PROBLEMS / SOLVED</b></div>
        <h2 id="case-title">THE ACCOUNT<br />THAT CAN&apos;T<br />DUMP YOU.</h2>
        <ol className="case-rows">
          <li>
            <a href="/app/" aria-label="Debanked. Solved by self-custody.">
              <i aria-hidden="true">01</i><span aria-hidden="true"><s>DEBANKED.</s> <b>SELF-CUSTODY.</b></span>
            </a>
          </li>
          <li>
            <a href="/credit/" aria-label="Invisible income. Solved by the lender packet.">
              <i aria-hidden="true">02</i><span aria-hidden="true"><s>INVISIBLE INCOME.</s> <b>LENDER PACKET.</b></span>
            </a>
          </li>
          <li>
            <a href="/privacy/" aria-label="Exposed. Solved by private by default.">
              <i aria-hidden="true">03</i><span aria-hidden="true"><s>EXPOSED.</s> <b>PRIVATE BY DEFAULT.</b></span>
            </a>
          </li>
        </ol>
        <div className="pq-declaration-foot"><p>DURABILITY /<br />POST-QUANTUM.</p><a href="/details/">DETAILS <span>↗</span></a></div>
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
