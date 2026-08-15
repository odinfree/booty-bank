const MONTHS_IN_YEAR = 12;

export function previewEligibility(input) {
  const monthlyNet = Number(input.monthlyNet);
  const payoutMonths = Number(input.payoutMonths);
  const volatility = Number(input.volatility);
  const chargebackRate = Number(input.chargebackRate);

  if (![monthlyNet, payoutMonths, volatility, chargebackRate].every(Number.isFinite)) {
    throw new TypeError("All eligibility inputs must be finite numbers.");
  }
  if (monthlyNet < 0 || payoutMonths < 0 || volatility < 0 || chargebackRate < 0) {
    throw new RangeError("Eligibility inputs cannot be negative.");
  }

  const historyFactor = Math.min(payoutMonths / MONTHS_IN_YEAR, 1);
  const stabilityFactor = Math.max(0, 1 - Math.min(volatility, 1));
  const adjustmentFactor = Math.max(0, 1 - Math.min(chargebackRate * 4, 1));
  const evidenceScore = Math.round(
    100 * (historyFactor * 0.35 + stabilityFactor * 0.45 + adjustmentFactor * 0.2),
  );
  const previewLimit = Math.floor(
    Math.min(monthlyNet * 1.5, monthlyNet * historyFactor * stabilityFactor * adjustmentFactor),
  );

  const band = evidenceScore >= 78 && payoutMonths >= 6
    ? "READY FOR LENDER REVIEW"
    : evidenceScore >= 58 && payoutMonths >= 3
      ? "MORE EVIDENCE REQUIRED"
      : "NOT READY FOR REVIEW";

  return {
    evidenceScore,
    previewLimit: Math.max(0, previewLimit),
    band,
    disclaimer: "SAMPLE LIMIT. NOT A CREDIT OFFER.",
  };
}
