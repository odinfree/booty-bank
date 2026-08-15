import assert from "node:assert/strict";
import test from "node:test";
import { previewEligibility } from "../src/lib/eligibility.mjs";

test("stable verified income reaches lender review", () => {
  const result = previewEligibility({
    monthlyNet: 18_400,
    payoutMonths: 14,
    volatility: 0.12,
    chargebackRate: 0.018,
  });
  assert.equal(result.band, "READY FOR LENDER REVIEW");
  assert.equal(result.evidenceScore, 93);
  assert.equal(result.previewLimit, 15_026);
});

test("short history cannot reach lender review", () => {
  const result = previewEligibility({
    monthlyNet: 18_400,
    payoutMonths: 2,
    volatility: 0.12,
    chargebackRate: 0.018,
  });
  assert.equal(result.band, "NOT READY FOR REVIEW");
});

test("high volatility reduces the preview limit", () => {
  const stable = previewEligibility({
    monthlyNet: 10_000,
    payoutMonths: 12,
    volatility: 0.1,
    chargebackRate: 0.01,
  });
  const volatile = previewEligibility({
    monthlyNet: 10_000,
    payoutMonths: 12,
    volatility: 0.8,
    chargebackRate: 0.01,
  });
  assert.ok(volatile.previewLimit < stable.previewLimit);
  assert.ok(volatile.evidenceScore < stable.evidenceScore);
});

test("rejects invalid inputs", () => {
  assert.throws(
    () => previewEligibility({ monthlyNet: -1, payoutMonths: 1, volatility: 0, chargebackRate: 0 }),
    RangeError,
  );
  assert.throws(
    () => previewEligibility({ monthlyNet: Number.NaN, payoutMonths: 1, volatility: 0, chargebackRate: 0 }),
    TypeError,
  );
});
