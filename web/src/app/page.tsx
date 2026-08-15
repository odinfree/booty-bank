"use client";

import { useMemo, useState } from "react";
import BankApp from "../components/bank-app";
import {
  buildPrivateIncomePacket,
  CORE_MONEY_FEATURES,
  NEOBANK_FEATURES,
  PRIVACY_FEATURES,
  SAMPLE_INPUT,
} from "../lib/private-packet.mjs";

const payoutBars = [54, 62, 58, 71, 64, 83, 78, 89, 84, 93, 87, 96];
type IncomeInput = typeof SAMPLE_INPUT;

export default function Home() {
  const [consent, setConsent] = useState(false);
  const [accountReady, setAccountReady] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [inputs, setInputs] = useState<IncomeInput>({ ...SAMPLE_INPUT });
  const packet = useMemo(() => buildPrivateIncomePacket(inputs), [inputs]);

  function updateInput(field: keyof IncomeInput, value: string) {
    setInputs((current) => ({ ...current, [field]: Number(value) }));
    setAccountReady(false);
  }

  function openDemo() {
    document.querySelector("#account")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <main>
      <header className="masthead">
        <a className="wordmark" href="#top">BOOTY BANK</a>
        <nav aria-label="Primary navigation">
          <a href="#app">APP</a>
          <a href="#account">CREDIT</a>
          <a href="#quantum">PQ SECURITY</a>
          <a href="#privacy">PRIVACY</a>
          <a href="#roadmap">ROADMAP</a>
        </nav>
        <div className="status"><i /> LIVE BUILD / SAMPLE DATA</div>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">THE MONEY ACCOUNT FOR ONLYFANS CREATORS</p>
        <h1>BORROW AGAINST<br />YOUR BBL.</h1>
        <div className="hero-aside">
          <p>THE PRIMARY MONEY ACCOUNT FOR CREATORS. PAYOUTS, CARDS, TRANSFERS, EXCHANGE, SAVINGS, INVESTING, CREDIT, AND FAN PERKS. NO REVOLUT REQUIRED.</p>
          <button onClick={openDemo}>OPEN THE DEMO ACCOUNT <span>↘</span></button>
        </div>
        <div className="hero-stamp">18+ CREATOR FINANCE<br />BUILT ON STARKNET</div>
      </section>

      <BankApp />

      <section className="replacement-matrix" aria-label="Primary account feature coverage">
        <div className="section-index"><span>02 / REVOLUT REPLACEMENT SURFACE</span><b>DEMO ≠ LIVE FINANCIAL RAIL</b></div>
        <div className="replacement-head"><h2>ONE ACCOUNT.<br />NO BACKUP BANK.</h2><p>THE DAILY-MONEY SURFACE IS INTERACTIVE NOW. CARD ISSUANCE, ATM ACCESS, CUSTODY, INVESTMENT EXECUTION, AND 24/7 HUMAN SUPPORT REQUIRE REGULATED OPERATORS BEFORE LAUNCH.</p></div>
        <div className="replacement-list">
          {CORE_MONEY_FEATURES.map((feature, index) => (
            <div key={feature.name}><span>{String(index + 1).padStart(2, "0")}</span><b>{feature.group}</b><h3>{feature.name}</h3><i data-status={feature.status}>{feature.status}</i></div>
          ))}
        </div>
      </section>

      <section className="account" id="account" aria-label="Booty Bank demo account">
        <div className="section-index">03 / BUILD YOUR CREDIT FILE</div>
        <div className="account-grid">
          <aside className="account-steps">
            <div className="active"><b>01</b><span>INCOME SOURCE</span></div>
            <div className={consent ? "active" : ""}><b>02</b><span>CONSENT</span></div>
            <div className={accountReady ? "active" : ""}><b>03</b><span>PRIVATE PACKET</span></div>
            <div className={accountReady ? "active" : ""}><b>04</b><span>LENDER REVIEW</span></div>
          </aside>

          <div className="account-form">
            <div className="form-head">
              <span>SAMPLE ONLYFANS PAYOUT HISTORY</span>
              <span>{accountReady ? "ACCOUNT READY" : "EDIT THE SAMPLE"}</span>
            </div>
            <div className="input-grid">
              <label>
                <span>MONTHLY NET / USD</span>
                <input type="number" value={inputs.monthlyNet} min="0" onChange={(event) => updateInput("monthlyNet", event.target.value)} />
              </label>
              <label>
                <span>PAYOUT HISTORY / MONTHS</span>
                <input type="number" value={inputs.payoutMonths} min="0" onChange={(event) => updateInput("payoutMonths", event.target.value)} />
              </label>
              <label>
                <span>VOLATILITY / DECIMAL</span>
                <input type="number" value={inputs.volatility} min="0" max="1" step="0.01" onChange={(event) => updateInput("volatility", event.target.value)} />
              </label>
              <label>
                <span>ADJUSTMENTS / DECIMAL</span>
                <input type="number" value={inputs.chargebackRate} min="0" max="1" step="0.001" onChange={(event) => updateInput("chargebackRate", event.target.value)} />
              </label>
            </div>
            <label className="consent-row">
              <input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setAccountReady(false); }} />
              <span>I AUTHORIZE THIS SAMPLE INCOME REVIEW. EXACT PAYOUTS AND MY CREATOR IDENTITY STAY OFFCHAIN.</span>
            </label>
            <button className="build-button" disabled={!consent} onClick={() => setAccountReady(true)}>
              {accountReady ? "PRIVATE PACKET CREATED" : "CREATE PRIVATE INCOME PACKET"}<span>↗</span>
            </button>
          </div>

          <div className={`account-card ${accountReady ? "ready" : ""}`}>
            <div className="card-top"><span>BOOTY / 0001</span><span>{accountReady ? "ACTIVE DEMO" : "LOCKED"}</span></div>
            <div className="card-mark">BB</div>
            <div className="card-bottom"><span>FALCON-512</span><span>PRIVATE BY DEFAULT</span></div>
          </div>
        </div>
      </section>

      <section className={`statement ${accountReady ? "unlocked" : ""}`} aria-label="Creator financial statement">
        <div className="statement-head">
          <span>PRIVATE ACCOUNT / 90 DAYS</span>
          <span>{accountReady ? "CONSENT ACTIVE" : "CREATE PACKET TO ACTIVATE"}</span>
          <button onClick={() => setPrivacyOpen(!privacyOpen)}>{privacyOpen ? "HIDE PRIVATE VALUES" : "REVEAL PRIVATE VALUES"}</button>
        </div>

        <div className="ledger-grid">
          <article className="income-panel">
            <div className="panel-label">01 / INCOME VAULT</div>
            <div className="income-total">
              <span>NET PAYOUT / 90D</span>
              <strong className={privacyOpen && accountReady ? "" : "redacted"}>${(inputs.monthlyNet * 3).toLocaleString("en-US")}</strong>
            </div>
            <div className="chart" aria-label="Sample payout history">
              {payoutBars.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
            </div>
            <div className="metrics">
              <div><span>PAYOUT HISTORY</span><strong>{inputs.payoutMonths} MO</strong></div>
              <div><span>VOLATILITY</span><strong>{Math.round(inputs.volatility * 100)}%</strong></div>
              <div><span>ADJUSTMENTS</span><strong>{(inputs.chargebackRate * 100).toFixed(1)}%</strong></div>
            </div>
          </article>

          <article className="credential-panel">
            <div className="panel-label">02 / PUBLIC CREDENTIAL</div>
            <div className="credential-mark"><span>∅</span></div>
            <dl>
              <div><dt>NULLIFIER</dt><dd>{packet.publicCredential.creatorNullifier}</dd></div>
              <div><dt>COMMITMENT</dt><dd>{packet.publicCredential.dataCommitment}</dd></div>
              <div><dt>VERSION</dt><dd>0{packet.publicCredential.version}</dd></div>
              <div><dt>EXPIRY</dt><dd>90 DAYS</dd></div>
            </dl>
            <p>NO HANDLE. NO PLATFORM LINK. NO EXACT EARNINGS.</p>
          </article>

          <article className="credit-panel">
            <div className="panel-label">03 / CREDIT DESK</div>
            <div className="score-line"><strong>{accountReady ? packet.lenderPacket.evidenceScore : "--"}</strong><span>/100 EVIDENCE SCORE</span></div>
            <div className="review-band">{accountReady ? packet.lenderPacket.reviewBand : "PACKET REQUIRED"}</div>
            <div className="limit-line">
              <span>ILLUSTRATIVE REVIEW LIMIT</span>
              <strong className={privacyOpen && accountReady ? "" : "redacted"}>${packet.lenderPacket.illustrativeLimit.toLocaleString("en-US")}</strong>
            </div>
            <p className="legal">{packet.lenderPacket.disclaimer}</p>
          </article>
        </div>
      </section>

      <section className="quantum" id="quantum">
        <div className="quantum-kicker">04 / POST-QUANTUM ACCOUNT</div>
        <h2>YOUR ACCOUNT<br />SHOULD OUTLIVE<br />ECDSA.</h2>
        <div className="quantum-grid">
          <div className="quantum-spec">
            <span>ACCOUNT CONTRACT</span><strong>BOOTYFALCONACCOUNT</strong>
            <span>SIGNATURE</span><strong>FALCON-512</strong>
            <span>HASH TO POINT</span><strong>SHAKE-256</strong>
            <span>LAYOUT</span><strong>31-FELT DIRECT</strong>
          </div>
          <div className="quantum-copy">
            <p>TRANSACTIONS ARE AUTHORIZED INSIDE A STARKNET ACCOUNT CONTRACT WITH A REAL FALCON-512 VERIFIER. THE DEMO ACCEPTS A GENUINE SIGNATURE, REJECTS TAMPERING, BLOCKS CONTRACT-CALLER EXECUTION, AND REJECTS LEGACY TRANSACTION VERSIONS.</p>
            <a href="https://github.com/OpenZeppelin/cairo-pq-verifiers" target="_blank" rel="noreferrer">OPEN THE VERIFIER SOURCE ↗</a>
          </div>
          <div className="quantum-status"><b>17 / 17</b><span>CAIRO TESTS PASS</span><small>EXPERIMENTAL / UNAUDITED / DEVNET BUILD</small></div>
        </div>
      </section>

      <section className="privacy" id="privacy">
        <div className="section-index">05 / PRIVACY CONTROL CENTER</div>
        <div className="privacy-title">
          <h2>YOUR MONEY.<br />NOT YOUR<br />PUBLIC PROFILE.</h2>
          <p>BOOTY BANK SPLITS IDENTITY, INCOME, ACCOUNT AUTHORIZATION, MONEY MOVEMENT, AND LENDER DISCLOSURE INTO SEPARATE PRIVACY LAYERS.</p>
        </div>
        <div className="privacy-boundary">
          <div><span>REGULATED PROVIDER</span><p>LEGAL IDENTITY<br />SOURCE OF FUNDS<br />UNDERWRITING FILE</p></div>
          <div><span>PUBLIC CHAIN</span><p>NULLIFIER<br />COMMITMENT<br />EXPIRY + VERSION</p></div>
          <div><span>PUBLIC + MERCHANTS</span><p>NO CREATOR HANDLE<br />NO PLATFORM LINK<br />NO EXACT PAYOUTS</p></div>
        </div>
      </section>

      <section className="roadmap" id="roadmap">
        <div className="section-index">06 / PRIVACY BUILD MATRIX</div>
        <div className="roadmap-list">
          {PRIVACY_FEATURES.map((feature, index) => (
            <div key={feature.name}>
              <span>{String(index + 1).padStart(2, "0")}</span><h3>{feature.name}</h3><p>{feature.layer}</p><b data-status={feature.status}>{feature.status}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="rails">
        <div className="section-index">07 / PARTNER RAILS</div>
        <div className="rail-list">
          <div><span>01</span><h2>EARN</h2><p>PRIVATE PAYOUT ROUTING</p><b>NEXT</b></div>
          <div><span>02</span><h2>SPEND</h2><p>CREATOR-SAFE CARD RAIL</p><b>PARTNER GATE</b></div>
          <div><span>03</span><h2>BORROW</h2><p>VERIFIED-INCOME HANDOFF</p><b>DEMO LIVE</b></div>
          <div><span>04</span><h2>INVEST</h2><p>REGULATED INVESTMENT RAIL</p><b>PARTNER GATE</b></div>
        </div>
      </section>

      <section className="community-finance">
        <div className="section-index">08 / CREATOR COMMERCE</div>
        <div className="community-head">
          <h2>TURN FANS<br />INTO A FINANCIAL<br />NETWORK.</h2>
          <p>AN ONLYFANS CREATOR CAN RUN A BRANDED COMMUNITY CARD, REWARD FAN SPEND, RELEASE PRIVATE DROPS, AND TURN EVERYDAY PAYMENTS INTO RECURRING CREATOR REVENUE.</p>
        </div>
        <div className="feature-grid">
          {NEOBANK_FEATURES.map((feature, index) => (
            <article key={feature.name}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{feature.name}</h3>
              <p>{feature.detail}</p>
              <b data-status={feature.status}>{feature.status}</b>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <p>WORKING HACKATHON PROTOTYPE. BOOTY BANK DOES NOT OPEN A BANK ACCOUNT, ISSUE CREDIT, PROVIDE A CARD, OR OFFER INVESTMENTS. NOT A LICENSED BANK. NOT AFFILIATED WITH ONLYFANS.</p>
        <p className="credits">
          IDEA <a href="https://x.com/Metachaser24/status/2088277057457225901?s=20" target="_blank" rel="noreferrer">@METACHASER24</a><span>/</span>
          SLOGAN <a href="https://x.com/NoRampLabs/status/2088575905962549667?s=20" target="_blank" rel="noreferrer">@NORAMPLABS</a><span>/</span>
          FOUND VIA <a href="https://x.com/8am1am" target="_blank" rel="noreferrer">@8AM1AM</a>
        </p>
      </footer>
    </main>
  );
}
