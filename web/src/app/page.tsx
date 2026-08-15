"use client";

import { useMemo, useState } from "react";
import { previewEligibility } from "../lib/eligibility.mjs";

const payoutBars = [54, 62, 58, 71, 64, 83, 78, 89, 84, 93, 87, 96];

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const preview = useMemo(
    () => previewEligibility({ monthlyNet: 18_400, payoutMonths: 14, volatility: 0.12, chargebackRate: 0.018 }),
    [],
  );

  return (
    <main>
      <header className="masthead">
        <div className="wordmark">PRIVATE CREATOR ACCOUNT</div>
        <div className="status"><i /> WORKING PROTOTYPE / SAMPLE DATA</div>
        <div className="folio">01 / 05</div>
      </header>

      <section className="hero">
        <p className="eyebrow">FINANCIAL INFRASTRUCTURE FOR ADULT CREATORS</p>
        <h1>PROVE THE PAYOUT.<br />KEEP THE HANDLE PRIVATE.</h1>
        <div className="hero-aside">
          <p>PROVE A STABLE PAYOUT HISTORY WITHOUT PUTTING YOUR HANDLE OR EXACT EARNINGS ONCHAIN.</p>
          <button onClick={() => setConnected(!connected)}>
            {connected ? "INCOME SOURCE CONNECTED" : "CONNECT SAMPLE INCOME"}
            <span>↗</span>
          </button>
        </div>
      </section>

      <section className="statement" aria-label="Creator financial statement">
        <div className="statement-head">
          <span>PRIVATE STATEMENT / 90 DAYS</span>
          <span>{connected ? "CONSENT ACTIVE" : "NOT CONNECTED"}</span>
          <span>UPDATED 15 AUG 2026</span>
        </div>

        <div className="ledger-grid">
          <article className="income-panel">
            <div className="panel-label">01 / VERIFIED INCOME</div>
            <div className="income-total">
              <span>NET PAYOUT / 90D</span>
              <strong className={privacyOpen ? "" : "redacted"}>$55,200</strong>
            </div>
            <div className="chart" aria-label="Sample payout history">
              {payoutBars.map((height, index) => (
                <i key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
            <div className="metrics">
              <div><span>PAYOUT HISTORY</span><strong>14 MO</strong></div>
              <div><span>VOLATILITY</span><strong>12%</strong></div>
              <div><span>ADJUSTMENTS</span><strong>1.8%</strong></div>
            </div>
          </article>

          <article className="proof-panel">
            <div className="panel-label">02 / PRIVACY CREDENTIAL</div>
            <div className="credential-mark"><span>∅</span></div>
            <p>THE PUBLIC CREDENTIAL CONTAINS A NULLIFIER, DATA COMMITMENT, EXPIRY, AND VERSION. PLATFORM IDENTITY AND PAYOUTS STAY OFFCHAIN.</p>
            <button className="text-button" onClick={() => setPrivacyOpen(!privacyOpen)}>
              {privacyOpen ? "HIDE SAMPLE VALUES" : "REVEAL SAMPLE VALUES"} ↗
            </button>
          </article>

          <article className="credit-panel">
            <div className="panel-label">03 / CREDIT ELIGIBILITY</div>
            <div className="score-line">
              <strong>{preview.evidenceScore}</strong><span>/100 EVIDENCE SCORE</span>
            </div>
            <div className="review-band">{preview.band}</div>
            <div className="limit-line">
              <span>ILLUSTRATIVE REVIEW LIMIT</span>
              <strong className={privacyOpen ? "" : "redacted"}>${preview.previewLimit.toLocaleString("en-US")}</strong>
            </div>
            <p className="legal">{preview.disclaimer}</p>
          </article>
        </div>
      </section>

      <section className="rails">
        <div className="section-index">04 / ACCOUNT RAILS</div>
        <div className="rail-list">
          <div><span>01</span><h2>RECEIVE</h2><p>PRIVATE PAYOUT ROUTING</p><b>PROTOTYPE</b></div>
          <div><span>02</span><h2>SPEND</h2><p>CARD + PAYMENT RAIL</p><b>PROVIDER REQUIRED</b></div>
          <div><span>03</span><h2>BORROW</h2><p>VERIFIED-INCOME HANDOFF</p><b>LENDER REQUIRED</b></div>
          <div><span>04</span><h2>INVEST</h2><p>REGULATED INVESTMENT RAIL</p><b>PROVIDER REQUIRED</b></div>
        </div>
      </section>

      <section className="boundary">
        <div className="section-index">05 / THE PRIVACY LINE</div>
        <div className="boundary-grid">
          <div><span>REGULATED PROVIDER SEES</span><p>LEGAL IDENTITY<br />SOURCE OF FUNDS<br />UNDERWRITING EVIDENCE</p></div>
          <div className="boundary-center"><span>PUBLIC CHAIN SEES</span><p>NULLIFIER<br />COMMITMENT<br />EXPIRY + VERSION</p></div>
          <div><span>PUBLIC + MERCHANTS SEE</span><p>NO CREATOR HANDLE<br />NO PLATFORM LINK<br />NO EXACT EARNINGS</p></div>
        </div>
      </section>

      <footer>
        <p>THIS DEMO DOES NOT OPEN A BANK ACCOUNT, ISSUE CREDIT, PROVIDE A CARD, OR OFFER INVESTMENTS.</p>
        <p>STARKNET / LOCAL PROTOTYPE / 2026</p>
      </footer>
    </main>
  );
}
