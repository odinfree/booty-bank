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
        <div><span>CASE FILE / CREATOR BANKING</span><b>THREE PROBLEMS / CLOSED</b></div>
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
        <div className="pq-declaration-foot"><p>DURABILITY /<br />POST-QUANTUM.</p><a href="#durability">DETAILS <span>↓</span></a></div>
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

      <section className="case-details" id="details" aria-labelledby="details-title">
        <div className="case-details-head"><span>05 / THE DETAILS</span><span>SOURCE DOCUMENT / @METACHASER24 / AUG 14 2026</span></div>
        <h2 id="details-title">READ THE FILE.</h2>
        <dl>
          <div>
            <dt>CAN MY ACCOUNT BE CLOSED?</dt>
            <dd>
              Banks close creator accounts without notice and call it derisking. Booty Bank is
              self-custodial. The keys are yours, and no risk desk sits between you and your
              money. There is no one upstream with the power to close the account.
            </dd>
          </div>
          <div>
            <dt>HOW DO I BORROW AGAINST CREATOR INCOME?</dt>
            <dd>
              Creator income is real money that credit models read as risk. The lender packet
              packages verified payout months as a credit file a lender can price.
              <span className="case-label">THE PACKET OMITS: FEED / FAN LIST / LEGAL NAME</span>
            </dd>
          </div>
          <div>
            <dt>WHO SEES WHAT?</dt>
            <dd>
              A fan and a landlord should never see the same account. Shielded balances, a
              public card face. The link between them stays private by default.
              <a className="case-link" href="/privacy/">OPEN PRIVACY ↗</a>
            </dd>
          </div>
          <div id="durability">
            <dt>HOW LONG DOES THIS HOLD?</dt>
            <dd>
              Signatures use Falcon-512, a post-quantum scheme. The signature scheme can be
              swapped under a live account, before anyone is forced to migrate.
              <span className="case-label">FALCON-512 ACCOUNT / BUILT</span>
              <span className="case-label">KEY ROTATION / BUILT</span>
              <span className="case-label">PQ RECOVERY / ROADMAP</span>
              <span className="case-label">EXPERIMENTAL / NOT DEPLOYED</span>
            </dd>
          </div>
        </dl>
      </section>

      <SiteFooter />
    </main>
  );
}
