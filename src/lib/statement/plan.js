/**
 * The debt plan the page shows, and the advisor quotes.
 *
 * One definition, so the two cannot disagree. It is the existing recommended
 * extra payment (calculateRecommendedPayment, via calculateMultipleDebts),
 * which is what the advisor's context and the calculator's Smart Payment Plan
 * already use, sized from the same surplus (income minus expenses, from
 * deriveSummary). The statement's fixes are an optional boost on top.
 *
 * When spending and bills already take everything that comes in, a
 * recommendation sized from the surplus would be fiction, so the plan is
 * funded by the fixes alone.
 *
 * No new arithmetic: every figure comes from the existing planner and tools.
 */
import { deriveMetrics } from '../derive';
import { deriveSummary } from '../profile';
import { calculateMultipleDebts } from '../planner/debt';
import { executeTool } from '../tools';

const payoff = (profile, extraPayment) => {
  const result = executeTool('simulate_debt_payoff', { extraPayment }, profile);
  return result.error ? null : result;
};

export const debtPlan = (profile, fixesSaving = 0) => {
  const summary = deriveSummary(profile);
  const debts = calculateMultipleDebts(profile.debts, null, summary);
  if (!debts) return null;

  const { monthlySurplus } = deriveMetrics(summary);
  const roomAfterMinimums = monthlySurplus - debts.totalMinPayment;
  const budgetFits = summary.monthlyIncome > 0 && roomAfterMinimums > 0 && debts.recommendedExtra <= roomAfterMinimums;

  const basis = budgetFits ? 'budget' : fixesSaving > 0 ? 'fixes' : null;
  if (!basis) return { basis: null, monthlySurplus, roomAfterMinimums };

  const extraPayment = basis === 'budget' ? debts.recommendedExtra : fixesSaving;
  const withFixes = basis === 'budget' && fixesSaving > 0 ? payoff(profile, extraPayment + fixesSaving) : null;

  return {
    basis,
    monthlySurplus,
    roomAfterMinimums,
    extraPayment,
    result: payoff(profile, extraPayment),
    withFixes: withFixes && { extraPayment: extraPayment + fixesSaving, result: withFixes },
  };
};
