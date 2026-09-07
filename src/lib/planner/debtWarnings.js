/**
 * Conditions the payoff simulation cannot express in its result.
 *
 * calculateStrategy returns a fixed shape pinned by characterization tests, so
 * these checks live alongside it rather than adding fields to it.
 */
import { PAYOFF_HORIZON_MONTHS, filterValidDebts } from './debt';

/** Monthly interest accrued on a debt at its current balance. */
export const monthlyInterest = (debt) =>
  (parseFloat(debt.balance) * (parseFloat(debt.interestRate) / 100)) / 12;

/**
 * Debts whose minimum payment does not cover their own interest. Left alone,
 * these grow forever — the single most important thing to tell someone, and
 * exactly the case the simulation used to hide behind a 50-year payoff figure.
 */
export const findUnpayableDebts = (debts) =>
  filterValidDebts(debts)
    .map((debt) => ({
      name: debt.name || 'This debt',
      minPayment: parseFloat(debt.minPayment),
      interest: monthlyInterest(debt),
    }))
    .filter(({ minPayment, interest }) => interest >= minPayment)
    .map((debt) => ({
      ...debt,
      shortfall: debt.interest - debt.minPayment,
    }));

/** True when the simulation ran out of runway instead of clearing the debt. */
export const hitsPayoffHorizon = (result) => Boolean(result) && result.months >= PAYOFF_HORIZON_MONTHS;

export { PAYOFF_HORIZON_MONTHS };
