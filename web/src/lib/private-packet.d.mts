export interface PrivateIncomeInput {
  monthlyNet: number;
  payoutMonths: number;
  volatility: number;
  chargebackRate: number;
}

export interface PrivacyFeature {
  name: string;
  status: "BUILT" | "DEMO" | "NEXT" | "ROADMAP";
  layer: string;
}

export interface NeobankFeature {
  name: string;
  status: "DEMO" | "NEXT" | "PARTNER" | "ROADMAP";
  detail: string;
}

export interface CoreMoneyFeature {
  group: string;
  name: string;
  status: "BUILT" | "DEMO" | "PARTNER" | "ROADMAP";
}

export const SAMPLE_INPUT: Readonly<PrivateIncomeInput>;
export const PRIVACY_FEATURES: ReadonlyArray<PrivacyFeature>;
export const NEOBANK_FEATURES: ReadonlyArray<NeobankFeature>;
export const CORE_MONEY_FEATURES: ReadonlyArray<CoreMoneyFeature>;
export function parseNonNegativeNumber(value: string): number | null;
export function buildPrivateIncomePacket(input?: PrivateIncomeInput): {
  privateStatement: {
    platform: string;
    monthlyNet: number;
    payoutMonths: number;
    volatility: number;
    chargebackRate: number;
    legalIdentity: string;
    creatorHandle: string;
  };
  publicCredential: {
    creatorNullifier: string;
    dataCommitment: string;
    validUntil: string;
    version: number;
    revoked: boolean;
  };
  lenderPacket: {
    evidenceScore: number;
    reviewBand: string;
    illustrativeLimit: number;
    disclaimer: string;
  };
  account: {
    contract: string;
    scheme: string;
    keyFelts: number;
    signatureFelts: number;
    network: string;
  };
};
