"use client";

import { useMemo, useState } from "react";
import SiteHeader from "../../components/site-header";
import { buildPrivateIncomePacket, SAMPLE_INPUT } from "../../lib/private-packet.mjs";

type IncomeInput = typeof SAMPLE_INPUT;

const incomePatterns = [
  { label: "STEADY", detail: "LOW MONTHLY SWING", value: 0.06 },
  { label: "TYPICAL", detail: "NORMAL MONTHLY SWING", value: 0.12 },
  { label: "VARIABLE", detail: "HIGH MONTHLY SWING", value: 0.25 },
];

const adjustmentPatterns = [
  { label: "LOW", detail: "UNDER 1%", value: 0.008 },
  { label: "STANDARD", detail: "ABOUT 2%", value: 0.018 },
  { label: "HIGH", detail: "ABOUT 4%", value: 0.04 },
];

export default function CreditPage() {
  const [consent, setConsent] = useState(false);
  const [ready, setReady] = useState(false);
  const [inputs, setInputs] = useState<IncomeInput>({ ...SAMPLE_INPUT });
  const packet = useMemo(() => buildPrivateIncomePacket(inputs), [inputs]);
  function update(field: keyof IncomeInput, value: string) { setInputs((current) => ({ ...current, [field]: Number(value) })); setReady(false); }
  function selectPreset(field: "volatility" | "chargebackRate", value: number) { setInputs((current) => ({ ...current, [field]: value })); setReady(false); }

  return (
    <main className="dossier-route dossier-green"><SiteHeader />
      <section className="dossier-page-head"><span>FILE / 02</span><span>PRIVATE INCOME UNDERWRITING</span><a href="/">CLOSE FILE ×</a><h1>CREDIT<br />WITHOUT<br />EXPOSURE.</h1><p>TURN CONSENTED PAYOUT HISTORY INTO THE MINIMUM EVIDENCE A LENDER NEEDS. EXACT EARNINGS AND CREATOR IDENTITY STAY OFFCHAIN.</p></section>
      <section className="credit-workbench">
        <div className="credit-inputs"><div className="workbench-label"><span>01 / INCOME INPUT</span><b>SAMPLE DATA</b></div>
          <div className="input-grid">
            <label><span>MONTHLY NET / USD</span><input type="number" value={inputs.monthlyNet} min="0" onChange={(event) => update("monthlyNet", event.target.value)} /></label>
            <label><span>PAYOUT HISTORY / MONTHS</span><input type="number" value={inputs.payoutMonths} min="0" onChange={(event) => update("payoutMonths", event.target.value)} /></label>
            <fieldset className="preset-field"><legend>INCOME PATTERN</legend><div>{incomePatterns.map((preset) => <button type="button" aria-pressed={inputs.volatility === preset.value} onClick={() => selectPreset("volatility", preset.value)} key={preset.label}><b>{preset.label}</b><span>{preset.detail}</span></button>)}</div></fieldset>
            <fieldset className="preset-field"><legend>PAYOUT ADJUSTMENTS</legend><div>{adjustmentPatterns.map((preset) => <button type="button" aria-pressed={inputs.chargebackRate === preset.value} onClick={() => selectPreset("chargebackRate", preset.value)} key={preset.label}><b>{preset.label}</b><span>{preset.detail}</span></button>)}</div></fieldset>
          </div>
          <label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setReady(false); }} /><span>I AUTHORIZE THIS SAMPLE INCOME REVIEW.</span></label>
          <button className="build-button" disabled={!consent} onClick={() => setReady(true)}>{ready ? "PACKET CREATED" : "CREATE PRIVATE PACKET"}<span>↗</span></button>
        </div>
        <div className={`credit-result ${ready ? "ready" : ""}`}><div className="workbench-label"><span>02 / LENDER OUTPUT</span><b>{ready ? "READY" : "LOCKED"}</b></div><div className="score-line"><strong>{ready ? packet.lenderPacket.evidenceScore : "--"}</strong><span>/ 100<br />EVIDENCE SCORE</span></div><dl><div><dt>REVIEW BAND</dt><dd>{ready ? packet.lenderPacket.reviewBand : "PACKET REQUIRED"}</dd></div><div><dt>ILLUSTRATIVE LIMIT</dt><dd>{ready ? `$${packet.lenderPacket.illustrativeLimit.toLocaleString("en-US")}` : "—"}</dd></div><div><dt>PUBLIC IDENTITY</dt><dd>NONE</dd></div><div><dt>EXACT PAYOUTS</dt><dd>OFFCHAIN</dd></div></dl><p>{packet.lenderPacket.disclaimer}</p></div>
      </section>
    </main>
  );
}
