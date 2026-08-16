import type { Metadata } from "next";
import SiteHeader from "../../components/site-header";
import SiteFooter from "../../components/site-footer";

export const metadata: Metadata = {
  title: "The Details / Booty Bank",
  description:
    "Self-custody, the lender packet, why a lender can trust creator income, who sees what, and how long it holds.",
  alternates: { canonical: "/details/" },
};

export default function DetailsPage() {
  return (
    <main className="dossier-route">
      <SiteHeader />
      <section className="case-details" id="details" aria-labelledby="details-title">
        <div className="case-details-head"><span>05 / THE DETAILS</span></div>
        <h1 id="details-title">THE DETAILS.</h1>
        <dl>
          <div>
            <dt>CAN MY ACCOUNT BE CLOSED?</dt>
            <dd>
              Banks close creator accounts without notice. This one is self-custodial. The keys
              are yours, and no one upstream can close it.
            </dd>
          </div>
          <div>
            <dt>HOW DO I BORROW AGAINST CREATOR INCOME?</dt>
            <dd>
              Creator income is real money that credit models read as risk. The lender packet
              packages verified payout months as a credit report a lender can price.
              <span className="case-label">THE PACKET OMITS: FEED / FAN LIST / LEGAL NAME</span>
            </dd>
          </div>
          <div>
            <dt>WHY WOULD A LENDER TRUST THIS?</dt>
            <dd>
              Income is verified at the source, and the login never leaves the browser.
              Installments come off the top of platform payouts, before the money reaches a
              spending balance.
              <span className="case-label">VERIFICATION / AT SOURCE</span>
              <span className="case-label">REPAYMENT / OFF THE TOP</span>
              <span className="case-label">CAPITAL / LICENSED PARTNER</span>
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
          <div>
            <dt>WHO RUNS THE LENDING RAILS?</dt>
            <dd>
              A licensed lender funds advances and handles collections. Cr3dentials builds this
              stack today, from source verification to repayment at the payout, and is a
              potential partner. Nothing is integrated yet.
              <a className="case-link" href="https://cr3dentials.xyz">CR3DENTIALS.XYZ ↗</a>
            </dd>
          </div>
          <div id="durability">
            <dt>HOW LONG DOES THIS HOLD?</dt>
            <dd>
              Signatures use Falcon-512, a post-quantum scheme. The account is crypto agile,
              meaning the signature scheme can be swapped under a live account, before anyone is
              forced to migrate.
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
