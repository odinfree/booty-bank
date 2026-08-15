import SiteHeader from "../../components/site-header";
import { PRIVACY_FEATURES } from "../../lib/private-packet.mjs";

export default function PrivacyPage() {
  return (
    <main className="dossier-route dossier-purple"><SiteHeader />
      <section className="dossier-page-head"><span>FILE / 03</span><span>PRIVACY + SECURITY</span><a href="/">CLOSE FILE ×</a><h1>PRIVATE<br />BY<br />DEFAULT.</h1><p>IDENTITY + PAYOUTS STAY OFFCHAIN.</p></section>
      <section className="privacy-summary"><article><span>01 / PROVIDER</span><h2>LEGAL IDENTITY</h2><p>REGULATED PROVIDER ONLY.</p></article><article><span>02 / PUBLIC CHAIN</span><h2>MINIMAL DATA</h2><p>NULLIFIER / COMMITMENT / EXPIRY / VERSION.</p></article><article><span>03 / ACCOUNT</span><h2>FALCON-512</h2><p>POST-QUANTUM ACCOUNT SIGNATURES.</p></article></section>
      <section className="privacy-roadmap"><div className="workbench-label"><span>BUILD MATRIX</span><b>BUILT / DEMO / NEXT / ROADMAP</b></div>{PRIVACY_FEATURES.map((feature, index) => <div key={feature.name}><span>{String(index + 1).padStart(2, "0")}</span><h3>{feature.name}</h3><p>{feature.layer}</p><b data-status={feature.status}>{feature.status}</b></div>)}</section>
    </main>
  );
}
