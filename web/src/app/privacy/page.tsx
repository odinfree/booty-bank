import SiteHeader from "../../components/site-header";
import { PRIVACY_FEATURES } from "../../lib/private-packet.mjs";

export default function PrivacyPage() {
  return (
    <main className="dossier-route dossier-purple"><SiteHeader />
      <section className="dossier-page-head"><span>FILE / 03</span><span>PRIVACY + ACCOUNT SECURITY</span><a href="/">CLOSE FILE ×</a><h1>PRIVATE<br />BY<br />DEFAULT.</h1><p>IDENTITY, INCOME, ACCOUNT AUTHORIZATION, MONEY MOVEMENT, AND LENDER DISCLOSURE ARE SEPARATE LAYERS—NOT ONE PUBLIC PROFILE.</p></section>
      <section className="privacy-summary"><article><span>01 / PROVIDER</span><h2>LEGAL IDENTITY</h2><p>HELD BY A REGULATED PROVIDER. NEVER PUBLISHED AS A CREATOR HANDLE.</p></article><article><span>02 / PUBLIC CHAIN</span><h2>MINIMAL PROOF</h2><p>NULLIFIER, COMMITMENT, EXPIRY, AND VERSION. NO EXACT PAYOUT HISTORY.</p></article><article><span>03 / ACCOUNT</span><h2>FALCON-512</h2><p>POST-QUANTUM TRANSACTION AUTHORIZATION IN A STARKNET ACCOUNT CONTRACT.</p></article></section>
      <section className="privacy-roadmap"><div className="workbench-label"><span>BUILD MATRIX</span><b>BUILT / DEMO / NEXT</b></div>{PRIVACY_FEATURES.map((feature, index) => <div key={feature.name}><span>{String(index + 1).padStart(2, "0")}</span><h3>{feature.name}</h3><p>{feature.layer}</p><b data-status={feature.status}>{feature.status}</b></div>)}</section>
    </main>
  );
}
