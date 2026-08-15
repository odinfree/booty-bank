export interface EligibilityInput {
  monthlyNet: number;
  payoutMonths: number;
  volatility: number;
  chargebackRate: number;
}

export interface EligibilityPreview {
  evidenceScore: number;
  previewLimit: number;
  band: "READY FOR LENDER REVIEW" | "MORE EVIDENCE REQUIRED" | "NOT READY FOR REVIEW";
  disclaimer: string;
}

export function previewEligibility(input: EligibilityInput): EligibilityPreview;

