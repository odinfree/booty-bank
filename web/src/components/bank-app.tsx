"use client";

import { useMemo, useState } from "react";

type View = "home" | "payments" | "cards" | "plan" | "wealth" | "creator" | "privacy" | "more";
type Action = "add" | "send" | "exchange" | "borrow" | null;

const nav: { id: View; label: string; mark: string }[] = [
  { id: "home", label: "HOME", mark: "⌂" },
  { id: "payments", label: "MOVE", mark: "↗" },
  { id: "cards", label: "CARDS", mark: "▰" },
  { id: "creator", label: "CREATOR", mark: "★" },
  { id: "more", label: "MORE", mark: "•••" },
];

const viewTitles: Record<View, string> = {
  home: "HOME",
  payments: "MOVE",
  cards: "CARDS",
  plan: "PLAN",
  wealth: "WEALTH",
  creator: "CREATOR",
  privacy: "PRIVACY",
  more: "MORE",
};

const transactions = [
  { icon: "OF", name: "ONLYFANS PAYOUT", meta: "INCOME / TODAY", amount: "+$4,820.00", tone: "positive" },
  { icon: "T", name: "TAX POCKET", meta: "AUTOMATIC SPLIT / TODAY", amount: "−$1,446.00", tone: "" },
  { icon: "A", name: "ADOBE", meta: "SOFTWARE / YESTERDAY", amount: "−$59.99", tone: "" },
  { icon: "PX", name: "PAXUM", meta: "TRANSFER / AUG 13", amount: "+$2,040.00", tone: "positive" },
  { icon: "U", name: "UBER", meta: "TRANSPORT / AUG 13", amount: "−$24.60", tone: "" },
];

const recipients = ["MAYA", "STUDIO", "TAX", "AGENT"];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button className={`app-toggle ${checked ? "on" : ""}`} onClick={onChange} aria-pressed={checked} aria-label={label}>
      <i />
    </button>
  );
}

function AppHeader({ title, privateMode, setPrivateMode }: { title: string; privateMode: boolean; setPrivateMode: (value: boolean) => void }) {
  return (
    <div className="app-view-head">
      <div><span>BOOTY / PERSONAL</span><h3>{title}</h3></div>
      <div className="app-head-actions">
        <button className={`privacy-pill ${privateMode ? "active" : ""}`} onClick={() => setPrivateMode(!privateMode)} aria-pressed={privateMode}>∅ {privateMode ? "PRIVATE" : "VISIBLE"}</button>
        <button className="round-button" aria-label="Open notifications">2</button>
        <button className="avatar-button" aria-label="Open profile">OF</button>
      </div>
    </div>
  );
}

export default function BankApp() {
  const [view, setView] = useState<View>("home");
  const [action, setAction] = useState<Action>(null);
  const [privateMode, setPrivateMode] = useState(true);
  const [cardFrozen, setCardFrozen] = useState(false);
  const [onlineSpend, setOnlineSpend] = useState(true);
  const [cashWithdrawals, setCashWithdrawals] = useState(false);
  const [autoSplit, setAutoSplit] = useState(true);
  const [amount, setAmount] = useState("250");
  const [currency, setCurrency] = useState("USD");
  const [recipient, setRecipient] = useState("MAYA");
  const [completed, setCompleted] = useState("");
  const title = viewTitles[view];

  const exchangeAmount = useMemo(() => {
    const value = Number(amount);
    return Number.isFinite(value) ? (value * 0.8554).toFixed(2) : "0.00";
  }, [amount]);

  function complete(label: string) {
    setCompleted(label);
    window.setTimeout(() => {
      setCompleted("");
      setAction(null);
    }, 1500);
  }

  return (
    <section className="product-demo" id="app" aria-label="Interactive Booty Bank product demo">
      <div className="section-index app-index"><span>01 / THE PRIMARY MONEY ACCOUNT</span><b>INTERACTIVE PRODUCT DEMO</b></div>
      <div className="bank-shell">
        <aside className="bank-sidebar">
          <a href="/" className="app-logo">BB</a>
          <nav aria-label="Bank application navigation">
            {nav.map((item) => (
              <button key={item.id} className={view === item.id || (item.id === "more" && ["plan", "wealth", "privacy"].includes(view)) ? "active" : ""} onClick={() => { setView(item.id); setAction(null); }}>
                <i>{item.mark}</i><span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="support-card"><span>24 / 7 SUPPORT</span><p>UNUSUAL PAYMENT?</p><button onClick={() => setCompleted("SUPPORT OPEN")}>GET HELP ↗</button></div>
        </aside>

        <div className="bank-content">
          <AppHeader title={title} privateMode={privateMode} setPrivateMode={setPrivateMode} />

          {view === "home" && (
            <div className="app-dashboard">
              <div className="balance-hero">
                <div className="balance-copy"><span>TOTAL BALANCE</span><strong className={privateMode ? "app-redacted" : ""}>$28,491.08</strong><small>+$6,142.10 THIS MONTH / +27.4%</small></div>
                <div className="balance-chart" aria-label="Balance trend over twelve weeks">{[22,29,27,38,41,48,44,59,66,71,78,92].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
              </div>

              <div className="quick-actions" aria-label="Quick actions">
                <button onClick={() => setAction("add")}><i>+</i><span>ADD MONEY</span></button>
                <button onClick={() => setAction("send")}><i>↗</i><span>SEND</span></button>
                <button onClick={() => setAction("exchange")}><i>⇄</i><span>EXCHANGE</span></button>
                <button onClick={() => setAction("borrow")}><i>$</i><span>BORROW</span></button>
              </div>

              <div className="dashboard-grid">
                <article className="activity-card">
                  <div className="app-card-head"><h4>ACTIVITY</h4><button onClick={() => setView("payments")}>SEE ALL</button></div>
                  <div className="transaction-list">
                    {transactions.slice(0, 3).map((item) => (
                      <button key={`${item.name}-${item.meta}`} onClick={() => setCompleted(`${item.name} DETAILS`)}>
                        <i>{item.icon}</i><span><b>{item.name}</b><small>{item.meta}</small></span><strong className={item.tone}>{privateMode ? "••••••" : item.amount}</strong>
                      </button>
                    ))}
                  </div>
                </article>

                <article className="payout-card">
                  <div className="app-card-head"><h4>NEXT PAYOUT</h4><span>IN 2 DAYS</span></div>
                  <div className="payout-source"><i>OF</i><span><b>ONLYFANS</b><small>EXPECTED / AUG 17</small></span></div>
                  <strong className={privateMode ? "app-redacted" : ""}>$5,120–$5,640</strong>
                  <div className="split-preview"><span>TAX 30%</span><span>OPERATING 15%</span><span>YOURS 55%</span></div>
                  <button className="inline-action" onClick={() => setView("creator")}>OPEN INCOME CENTER ↗</button>
                </article>

              </div>
            </div>
          )}

          {view === "payments" && (
            <div className="app-page">
              <div className="page-lead"><div><span>MOVE MONEY</span><h4>SEND. REQUEST. SCHEDULE.</h4></div><button className="primary-app-button" onClick={() => setAction("send")}>NEW PAYMENT +</button></div>
              <div className="recipient-strip"><div className="recipient-add"><i>+</i><span>NEW</span></div>{recipients.map((name) => <button key={name} onClick={() => { setRecipient(name); setAction("send"); }}><i>{name.slice(0, 2)}</i><span>{name}</span></button>)}</div>
              <div className="payment-grid">
                <article><div className="app-card-head"><h4>RECENT</h4><button onClick={() => setCompleted("FILTERS OPEN")}>FILTER</button></div><div className="transaction-list">{transactions.map((item) => <button key={`${item.name}-${item.meta}`}><i>{item.icon}</i><span><b>{item.name}</b><small>{item.meta}</small></span><strong className={item.tone}>{privateMode ? "••••••" : item.amount}</strong></button>)}</div></article>
                <article className="upcoming-list"><div className="app-card-head"><h4>UPCOMING</h4><button onClick={() => setCompleted("SCHEDULE OPEN")}>MANAGE</button></div><div><span>AUG 18</span><b>STUDIO RENT</b><strong>−$1,250</strong></div><div><span>AUG 21</span><b>HEALTH INSURANCE</b><strong>−$390</strong></div><div><span>AUG 25</span><b>RECURRING INVEST</b><strong>−$500</strong></div><button className="inline-action" onClick={() => setCompleted("PAYMENT LINK COPIED")}>CREATE PAYMENT LINK ↗</button></article>
              </div>
            </div>
          )}

          {view === "cards" && (
            <div className="app-page">
              <div className="page-lead"><div><span>4 ACTIVE CARDS</span><h4>EVERY CARD. ONE CONTROL ROOM.</h4></div><button className="primary-app-button" onClick={() => setCompleted("NEW CARD FLOW OPEN")}>NEW CARD +</button></div>
              <div className="cards-layout">
                <div className={`control-card ${cardFrozen ? "frozen" : ""}`}><div><span>BOOTY / PHYSICAL</span><span>VISA</span></div><b>4859 •••• •••• 0935</b><div><span>OF CREATOR</span><span>08 / 30</span></div></div>
                <article className="card-controls"><div className="app-card-head"><h4>CARD CONTROLS</h4><span>••0935</span></div><div className="control-row"><span><b>FREEZE CARD</b><small>STOP ALL NEW PAYMENTS</small></span><Toggle checked={cardFrozen} onChange={() => setCardFrozen(!cardFrozen)} label="Freeze card" /></div><div className="control-row"><span><b>ONLINE PAYMENTS</b><small>WEB + IN-APP PURCHASES</small></span><Toggle checked={onlineSpend} onChange={() => setOnlineSpend(!onlineSpend)} label="Toggle online payments" /></div><div className="control-row"><span><b>CASH WITHDRAWALS</b><small>ATM ACCESS</small></span><Toggle checked={cashWithdrawals} onChange={() => setCashWithdrawals(!cashWithdrawals)} label="Toggle cash withdrawals" /></div><button className="inline-action" onClick={() => setCompleted("SPEND LIMIT SAVED")}>SET MONTHLY LIMIT / $6,000 ↗</button></article>
              </div>
              <div className="card-types"><button><i>01</i><b>PHYSICAL</b><span>ACTIVE / ••0935</span></button><button><i>02</i><b>VIRTUAL</b><span>ACTIVE / ••8041</span></button><button><i>03</i><b>DISPOSABLE</b><span>NEW NUMBER AFTER USE</span></button><button onClick={() => setView("creator")}><i>04</i><b>FAN CARD</b><span>CREATOR REWARDS</span></button></div>
            </div>
          )}

          {view === "plan" && (
            <div className="app-page">
              <div className="page-lead"><div><span>THIS MONTH</span><h4>EVERY DOLLAR HAS A JOB.</h4></div><button className="primary-app-button" onClick={() => setCompleted("NEW POCKET OPEN")}>NEW POCKET +</button></div>
              <div className="plan-grid"><article className="spend-ring"><div className="app-card-head"><h4>SPENDING</h4><span>AUGUST</span></div><div className="ring"><span><b>{privateMode ? "••••" : "$5,842"}</b><small>OF $8,000</small></span></div><div className="legend"><span><i />LIVING 38%</span><span><i />BUSINESS 34%</span><span><i />OTHER 28%</span></div></article><article className="rules-list"><div className="app-card-head"><h4>PAYOUT RULES</h4><Toggle checked={autoSplit} onChange={() => setAutoSplit(!autoSplit)} label="Toggle all payout rules" /></div><div><span><i className="tax" />TAX</span><b>30%</b><small>UNTIL $25K</small></div><div><span><i className="ops" />OPERATING</span><b>15%</b><small>EVERY PAYOUT</small></div><div><span><i className="save" />INVEST</span><b>10%</b><small>MONTHLY</small></div><button className="inline-action" onClick={() => setCompleted("RULE EDITOR OPEN")}>EDIT AUTOMATION ↗</button></article></div>
              <div className="insight-banner"><span>SPEND SIGNAL</span><p>SOFTWARE SPEND IS 18% LOWER THAN YOUR 3-MONTH AVERAGE.</p><button onClick={() => setCompleted("INSIGHT SAVED")}>SAVE THE DIFFERENCE ↗</button></div>
            </div>
          )}

          {view === "wealth" && (
            <div className="app-page">
              <div className="page-lead"><div><span>NET WORTH</span><h4 className={privateMode ? "app-redacted" : ""}>$47,719.08</h4></div><button className="primary-app-button" onClick={() => setCompleted("INVEST FLOW OPEN")}>INVEST +</button></div>
              <div className="wealth-grid"><article className="wealth-chart"><div className="app-card-head"><h4>PORTFOLIO</h4><span>+$1,422 / 90D</span></div><div className="line-chart"><svg viewBox="0 0 500 180" role="img" aria-label="Illustrative portfolio chart"><path d="M0 154 C50 148 78 160 122 126 S190 132 230 99 S295 122 332 72 S412 86 500 18" fill="none" vectorEffect="non-scaling-stroke" /></svg></div><div className="wealth-totals"><div><span>CASH</span><b>{privateMode ? "••••" : "$28,491"}</b></div><div><span>INVESTED</span><b>{privateMode ? "••••" : "$12,428"}</b></div><div><span>FUTURE POCKET</span><b>{privateMode ? "••••" : "$6,800"}</b></div></div></article><article className="recurring-card"><div className="app-card-head"><h4>AUTOPILOT</h4><span>ACTIVE</span></div><strong>$500</strong><p>INVESTED ON THE 25TH OF EVERY MONTH.</p><div><span>GLOBAL INDEX</span><b>70%</b></div><div><span>SHORT-TERM BONDS</span><b>30%</b></div><button className="inline-action" onClick={() => setCompleted("AUTOPILOT EDITOR OPEN")}>EDIT AUTOPILOT ↗</button></article></div>
              <p className="app-disclaimer">ILLUSTRATIVE PRODUCT DEMO. INVESTMENT EXECUTION REQUIRES A REGULATED PARTNER. VALUES CAN FALL.</p>
            </div>
          )}

          {view === "creator" && (
            <div className="app-page">
              <div className="page-lead"><div><span>CREATOR OPERATING SYSTEM</span><h4>GET PAID. STAY PRIVATE. GROW.</h4></div><button className="primary-app-button" onClick={() => setAction("borrow")}>GET ADVANCE ↗</button></div>
              <div className="creator-grid"><article className="source-card"><div className="app-card-head"><h4>INCOME SOURCES</h4><button onClick={() => setCompleted("SOURCE CONNECTOR OPEN")}>CONNECT +</button></div><div><i>OF</i><span><b>ONLYFANS</b><small>CONNECTED / LAST SYNC 08:42</small></span><strong>{privateMode ? "••••" : "$18,400 / MO"}</strong></div><div><i>PX</i><span><b>PAXUM</b><small>CONNECTED / LAST SYNC 08:40</small></span><strong>{privateMode ? "••••" : "$2,040 / MO"}</strong></div><div className="income-evidence"><span>PRIVATE INCOME EVIDENCE</span><b>VERIFIED</b><small>EXPIRES IN 72 DAYS</small></div></article><article className="advance-card"><span>AVAILABLE TO REQUEST</span><strong className={privateMode ? "app-redacted" : ""}>$24,800</strong><p>BASED ON 14 MONTHS OF CONSENTED PAYOUT EVIDENCE. A LENDER RECEIVES THE MINIMUM REQUIRED PACKET.</p><button onClick={() => setAction("borrow")}>REVIEW ADVANCE ↗</button></article></div>
              <div className="fan-perks"><div className="app-card-head"><h4>FAN PERKS</h4><button onClick={() => setCompleted("PERK BUILDER OPEN")}>NEW PERK +</button></div><div className="perk-row"><span>01</span><b>BACKSTAGE CARD</b><p>2X POINTS / EARLY DROP ACCESS</p><strong>1,284 MEMBERS</strong></div><div className="perk-row"><span>02</span><b>PRIVATE DROP</b><p>TOP 10% OF CARD SPENDERS</p><strong>AUG 29</strong></div><div className="perk-row"><span>03</span><b>CREATOR SHARE</b><p>ILLUSTRATIVE FAN-CARD REVENUE</p><strong>{privateMode ? "••••" : "$2,180 / MO"}</strong></div></div>
            </div>
          )}

          {view === "privacy" && (
            <div className="app-page privacy-page">
              <div className="page-lead"><div><span>PRIVACY CONTROL CENTER</span><h4>SHARE THE MINIMUM. SEE EVERY ACCESS.</h4></div><div className="privacy-score"><b>82</b><span>/ 100</span></div></div>
              <div className="privacy-control-grid"><article><span>ACCOUNT AUTHORIZATION</span><h5>FALCON-512</h5><p>TRANSACTION AUTHORIZATION RUNS IN THE BOOTYFALCONACCOUNT CONTRACT.</p><b>BUILT / EXPERIMENTAL</b></article><article><span>INCOME DISCLOSURE</span><h5>MINIMUM PACKET</h5><p>LENDERS SEE AN EVIDENCE SCORE AND BAND. EXACT PAYOUTS STAY OFFCHAIN.</p><b>DEMO LIVE</b></article><article><span>MONEY MOVEMENT</span><h5>SHIELDED PAYOUTS</h5><p>STRK20 NOTES, NULLIFIERS, VIEWING KEYS, AND PRIVATE NOTE DISCOVERY.</p><b>NEXT BUILD</b></article></div>
              <article className="access-log"><div className="app-card-head"><h4>DATA ACCESS LOG</h4><button onClick={() => setCompleted("ACCESS REPORT EXPORTED")}>EXPORT</button></div><div><span>TODAY / 10:14</span><b>YOU</b><p>REVEALED EXACT PAYOUT RANGE</p><strong>SELF</strong></div><div><span>AUG 12 / 16:08</span><b>SAMPLE LENDER</b><p>EVIDENCE SCORE + REVIEW BAND</p><strong>EXPIRED</strong></div><div><span>AUG 01 / 09:20</span><b>VERIFIER</b><p>COMMITMENT + NULLIFIER</p><strong>ACTIVE</strong></div></article>
            </div>
          )}

          {view === "more" && (
            <div className="app-page">
              <div className="page-lead"><div><span>ACCOUNT TOOLS</span><h4>THE REST. OUT OF THE WAY.</h4></div></div>
              <div className="more-menu">
                <button onClick={() => setView("plan")}><span>01</span><b>PLAN</b><p>POCKETS, BUDGETS, AND AUTOMATIC PAYOUT RULES.</p><i>↗</i></button>
                <button onClick={() => setView("wealth")}><span>02</span><b>WEALTH</b><p>SAVINGS, NET WORTH, AND RECURRING INVESTING.</p><i>↗</i></button>
                <button onClick={() => setView("privacy")}><span>03</span><b>PRIVACY</b><p>DISCLOSURE CONTROLS, ACCESS LOGS, AND ACCOUNT SECURITY.</p><i>↗</i></button>
              </div>
            </div>
          )}

          {action && (
            <div className="action-backdrop" onClick={() => setAction(null)}>
              <div className="action-sheet" role="dialog" aria-modal="true" aria-label={`${action} money`} onClick={(event) => event.stopPropagation()}>
                <div className="sheet-head"><span>{action === "add" ? "ADD MONEY" : action === "send" ? "NEW PAYMENT" : action === "exchange" ? "EXCHANGE" : "CREATOR ADVANCE"}</span><button onClick={() => setAction(null)} aria-label="Close">×</button></div>
                {action === "send" && <><label><span>TO</span><select value={recipient} onChange={(event) => setRecipient(event.target.value)}>{recipients.map((name) => <option key={name}>{name}</option>)}</select></label><label><span>AMOUNT</span><div className="money-input"><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /><select value={currency} onChange={(event) => setCurrency(event.target.value)}><option>USD</option><option>EUR</option><option>GBP</option><option>USDC</option></select></div></label><div className="sheet-summary"><span>ARRIVES</span><b>INSTANTLY</b><span>FEE</span><b>$0.00</b></div><button className="sheet-submit" disabled={!Number(amount)} onClick={() => complete(`SENT ${amount} ${currency} TO ${recipient}`)}>REVIEW AND SEND ↗</button></>}
                {action === "exchange" && <><label><span>YOU SELL</span><div className="money-input"><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /><select><option>USD</option></select></div></label><label><span>YOU GET</span><div className="money-input"><input value={exchangeAmount} readOnly /><select><option>EUR</option></select></div></label><div className="sheet-summary"><span>DEMO RATE</span><b>1 USD = 0.8554 EUR</b><span>FEE</span><b>$0.00</b></div><button className="sheet-submit" disabled={!Number(amount)} onClick={() => complete(`EXCHANGED ${amount} USD`)}>CONFIRM EXCHANGE ↗</button></>}
                {action === "add" && <><div className="funding-options"><button onClick={() => complete("BANK TRANSFER DETAILS OPEN")}><i>→</i><span><b>BANK TRANSFER</b><small>PERSONAL ACCOUNT DETAILS</small></span></button><button onClick={() => complete("CARD TOP-UP OPEN")}><i>▰</i><span><b>DEBIT CARD</b><small>INSTANT TOP-UP</small></span></button><button onClick={() => complete("PAYOUT ROUTING OPEN")}><i>OF</i><span><b>CREATOR PAYOUT</b><small>ROUTE PLATFORM INCOME</small></span></button></div></>}
                {action === "borrow" && <><div className="borrow-amount"><span>ILLUSTRATIVE REQUEST LIMIT</span><b>$24,800</b><small>14 MONTHS VERIFIED / 88 EVIDENCE SCORE</small></div><label><span>REQUEST</span><div className="money-input"><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /><select><option>USD</option></select></div></label><div className="consent-callout"><b>MINIMUM DISCLOSURE</b><p>THE LENDER RECEIVES YOUR EVIDENCE SCORE, REVIEW BAND, REQUEST, AND CONSENT RECORD—NOT YOUR HANDLE OR EXACT PAYOUT HISTORY.</p></div><button className="sheet-submit" disabled={!Number(amount) || Number(amount) > 24800} onClick={() => complete("LENDER PACKET CREATED")}>CREATE LENDER PACKET ↗</button><p className="sheet-legal">DEMO ONLY. NO CREDIT DECISION OR LOAN IS OFFERED.</p></>}
              </div>
            </div>
          )}

          {completed && <div className="app-toast" role="status"><i>✓</i><span>{completed}</span></div>}
        </div>
      </div>
      <div className="product-boundary"><b>PRODUCT SURFACE / WORKING DEMO</b><span>PARTNER RAILS ARE LABELLED IN THE BUILD MATRIX BELOW. NO FUNDS MOVE.</span></div>
    </section>
  );
}
