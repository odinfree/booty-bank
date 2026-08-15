import { previewEligibility } from "./eligibility.mjs";

export const SAMPLE_INPUT = Object.freeze({
  monthlyNet: 18_400,
  payoutMonths: 14,
  volatility: 0.12,
  chargebackRate: 0.018,
});

export const PRIVACY_FEATURES = Object.freeze([
  { name: "MINIMAL INCOME CREDENTIAL", status: "BUILT", layer: "CREDENTIAL" },
  { name: "EXPIRY + REVOCATION", status: "BUILT", layer: "CREDENTIAL" },
  { name: "FALCON-512 ACCOUNT", status: "BUILT", layer: "ACCOUNT" },
  { name: "EXACT EARNINGS OFFCHAIN", status: "BUILT", layer: "DATA" },
  { name: "SELECTIVE LENDER PACKET", status: "DEMO", layer: "CREDIT" },
  { name: "STRK20 SHIELDED PAYOUTS", status: "NEXT", layer: "MONEY" },
  { name: "PRIVATE SUB-ACCOUNTS", status: "NEXT", layer: "ACCOUNT GRAPH" },
  { name: "VIEWING-KEY DISCLOSURE", status: "NEXT", layer: "COMPLIANCE" },
  { name: "RELAYER + PAYMASTER", status: "NEXT", layer: "NETWORK" },
  { name: "BATCHED PUBLISHING", status: "ROADMAP", layer: "TIMING" },
  { name: "PRIVATE NOTE DISCOVERY", status: "ROADMAP", layer: "WALLET" },
  { name: "PQ RECOVERY + KEY ROTATION", status: "ROADMAP", layer: "ACCOUNT" },
]);

export const NEOBANK_FEATURES = Object.freeze([
  { name: "HOLD DIGITAL DOLLARS", status: "NEXT", detail: "SELF-CUSTODIAL STABLECOIN ACCOUNT" },
  { name: "GLOBAL SPEND", status: "PARTNER", detail: "LOW-FEE CARD SETTLEMENT" },
  { name: "INSTANT VIRTUAL CARD", status: "PARTNER", detail: "CREATOR-SAFE CARD ISSUANCE" },
  { name: "APPLE PAY + GOOGLE PAY", status: "PARTNER", detail: "MOBILE WALLET PROVISIONING" },
  { name: "SEND + RECEIVE", status: "NEXT", detail: "INSTANT DIGITAL-DOLLAR TRANSFERS" },
  { name: "POINTS + REWARDS", status: "DEMO", detail: "CREATOR-DEFINED LOYALTY" },
  { name: "CREATOR COMMUNITY CARD", status: "ROADMAP", detail: "BRANDED CARD FOR FANS" },
  { name: "REVENUE SHARE", status: "ROADMAP", detail: "FAN SPEND FUNDS THE CREATOR" },
  { name: "DROPS + EXPERIENCES", status: "ROADMAP", detail: "ACCESS, MERCH, EVENTS" },
  { name: "INCOME ADVANCE", status: "DEMO", detail: "VERIFIED-INCOME LENDER HANDOFF" },
  { name: "AUTOMATIC TAX VAULT", status: "ROADMAP", detail: "RULE-BASED PAYOUT ALLOCATION" },
  { name: "INVEST", status: "PARTNER", detail: "REGULATED INVESTMENT RAIL" },
]);

export const CORE_MONEY_FEATURES = Object.freeze([
  { group: "HOME", name: "TOTAL BALANCE + NET WORTH", status: "DEMO" },
  { group: "HOME", name: "INSTANT ACTIVITY FEED", status: "DEMO" },
  { group: "MONEY", name: "MULTI-CURRENCY ACCOUNTS", status: "DEMO" },
  { group: "MONEY", name: "LIVE EXCHANGE PREVIEW", status: "DEMO" },
  { group: "MONEY", name: "BANK + PEER TRANSFERS", status: "DEMO" },
  { group: "MONEY", name: "PAYMENT LINKS + REQUESTS", status: "DEMO" },
  { group: "MONEY", name: "SCHEDULED PAYMENTS + DIRECT DEBITS", status: "DEMO" },
  { group: "CARDS", name: "PHYSICAL + VIRTUAL CARDS", status: "DEMO" },
  { group: "CARDS", name: "DISPOSABLE VIRTUAL CARD", status: "DEMO" },
  { group: "CARDS", name: "CARD FREEZE + GRANULAR CONTROLS", status: "DEMO" },
  { group: "CARDS", name: "APPLE PAY + GOOGLE PAY", status: "PARTNER" },
  { group: "CASH", name: "ATM WITHDRAWALS", status: "PARTNER" },
  { group: "PLAN", name: "POCKETS + BUDGETS", status: "DEMO" },
  { group: "PLAN", name: "AUTOMATIC PAYOUT SPLITS", status: "DEMO" },
  { group: "PLAN", name: "SPEND ANALYTICS", status: "DEMO" },
  { group: "WEALTH", name: "SAVINGS + RECURRING INVESTING", status: "DEMO" },
  { group: "WEALTH", name: "STOCKS + DIGITAL ASSETS", status: "PARTNER" },
  { group: "CREDIT", name: "CREATOR INCOME ADVANCE", status: "DEMO" },
  { group: "SECURITY", name: "BIOMETRICS + PASSKEY RECOVERY", status: "ROADMAP" },
  { group: "SECURITY", name: "FRAUD ALERTS + 24/7 SUPPORT", status: "PARTNER" },
  { group: "SECURITY", name: "FALCON-512 AUTHORIZATION", status: "BUILT" },
]);

function finiteNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new RangeError(`${field} must be a non-negative finite number.`);
  }
  return number;
}

export function parseNonNegativeNumber(value) {
  if (value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function buildPrivateIncomePacket(input = SAMPLE_INPUT) {
  const normalized = {
    monthlyNet: finiteNumber(input.monthlyNet, "monthlyNet"),
    payoutMonths: finiteNumber(input.payoutMonths, "payoutMonths"),
    volatility: finiteNumber(input.volatility, "volatility"),
    chargebackRate: finiteNumber(input.chargebackRate, "chargebackRate"),
  };
  const preview = previewEligibility(normalized);

  return {
    privateStatement: {
      platform: "OnlyFans",
      monthlyNet: normalized.monthlyNet,
      payoutMonths: normalized.payoutMonths,
      volatility: normalized.volatility,
      chargebackRate: normalized.chargebackRate,
      legalIdentity: "HELD BY REGULATED PROVIDER",
      creatorHandle: "HELD OFFCHAIN",
    },
    publicCredential: {
      creatorNullifier: "0x071c...b92e",
      dataCommitment: "0x04b8...8f31",
      validUntil: "2026-11-13T00:00:00Z",
      version: 1,
      revoked: false,
    },
    lenderPacket: {
      evidenceScore: preview.evidenceScore,
      reviewBand: preview.band,
      illustrativeLimit: preview.previewLimit,
      disclaimer: preview.disclaimer,
    },
    account: {
      contract: "BOOTYFALCONACCOUNT",
      scheme: "FALCON-512 / SHAKE-256 DIRECT",
      keyFelts: 29,
      signatureFelts: 31,
      network: "LOCAL DEVNET",
    },
  };
}
