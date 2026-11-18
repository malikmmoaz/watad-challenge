/**
 * How each factor moves the outcome: what the score, band and limit would be
 * with full marks on that factor, and with none. Pure; reads only the scorecard.
 */
import type { CreditBand, Halalas, ScoreFactorId, Scorecard } from "../types";
import { BAND_MULTIPLIER } from "./engine";
import { bandFor } from "./scorecard";

export interface Outcome {
  score: number;
  band: CreditBand;
  limit: Halalas;
}

export interface FactorImpact {
  factorId: ScoreFactorId;
  current: Outcome;
  atFull: Outcome;
  atZero: Outcome;
}

/** Limit for a band from the lowest of the three bases (the first three capBasis rows), capped at the request. */
export function limitFor(card: Scorecard, band: CreditBand, requestedCap: Halalas): Halalas {
  const base = Math.min(...card.capBasis.slice(0, 3).map((b) => b.amount));
  const sar = Math.floor(((base / 100) * BAND_MULTIPLIER[band]) / 1000) * 1000;
  return Math.max(0, Math.min(sar * 100, requestedCap)) as Halalas;
}

const outcome = (card: Scorecard, total: number, requestedCap: Halalas): Outcome => {
  const score = Math.round(total);
  const band = bandFor(score);
  return { score, band, limit: limitFor(card, band, requestedCap) };
};

export function factorImpacts(card: Scorecard, requestedCap: Halalas): FactorImpact[] {
  const total = card.factors.reduce((s, f) => s + f.points, 0);
  return card.factors.map((f) => ({
    factorId: f.id,
    current: outcome(card, total, requestedCap),
    atFull: outcome(card, total - f.points + f.weight, requestedCap),
    atZero: outcome(card, total - f.points, requestedCap),
  }));
}
