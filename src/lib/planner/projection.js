/**
 * Compound growth of savings.
 *
 * The advisor is forbidden from producing compound projections in prose, so
 * this is what it calls instead. Assumptions are returned alongside the result
 * so the answer can state them.
 */
import { toNumber } from '../derive';
import { MAX_HORIZON_MONTHS } from './goals';

/**
 * A long-run average, not a promise. Any answer built on this must say so —
 * the prompt's investment guardrail requires it.
 */
export const DEFAULT_ANNUAL_RETURN_PCT = 5;

export const projectSavings = ({
  initialAmount = 0,
  monthlyContribution = 0,
  months = 0,
  annualReturnPct = DEFAULT_ANNUAL_RETURN_PCT,
}) => {
  const start = toNumber(initialAmount);
  const contribution = toNumber(monthlyContribution);
  const periods = Math.min(Math.max(0, Math.floor(toNumber(months))), MAX_HORIZON_MONTHS);
  const annualReturn = toNumber(annualReturnPct);
  const monthlyRate = annualReturn / 100 / 12;

  let balance = start;
  for (let month = 0; month < periods; month++) {
    balance = balance * (1 + monthlyRate) + contribution;
  }

  const contributed = contribution * periods;
  const round = (value) => Math.round(value * 100) / 100;

  return {
    months: periods,
    initialAmount: round(start),
    monthlyContribution: round(contribution),
    annualReturnPct: annualReturn,
    finalBalance: round(balance),
    totalContributed: round(contributed),
    growth: round(balance - start - contributed),
    assumption: `Assumes a ${annualReturn}% average annual return, compounded monthly. Actual returns vary and are not guaranteed.`,
  };
};
