/**
 * Assembles the financial picture the advisor reasons from.
 *
 * Before this, the model received five raw strings and did its own arithmetic
 * in prose. Everything here is computed by the same tested functions that drive
 * the UI, so the advisor and the dashboard cannot disagree, and the model's job
 * is reduced to explaining figures rather than deriving them.
 *
 * Numbers are rounded on the way out: an unrounded 8.333333333333332 invites the
 * model to quote it back verbatim.
 */
import { deriveMetrics } from './derive';
import { calculateHealthScore, getScoreRating } from './healthScore';
import { calculateMultipleDebts, filterValidDebts } from './planner/debt';
import { findUnpayableDebts, hitsPayoffHorizon } from './planner/debtWarnings';
import { STATUS, getProtectionChecks } from './protection';
import { deriveSummary, profileCompleteness, LIQUID_ASSET_TYPES } from './profile';
import { toNumber } from './derive';

/** Keep the context bounded no matter how much the user enters. */
export const MAX_LIST_ITEMS = 20;

const money = (value) => Math.round(value * 100) / 100;
const percent = (value) => Math.round(value * 10) / 10;

const round = (value, rounder) => (Number.isFinite(value) ? rounder(value) : null);

const payoffSummary = (result) =>
  result && {
    months: result.months,
    totalInterest: money(result.totalInterest),
    totalPaid: money(result.totalPaid),
    monthlyPayment: money(result.monthlyPayment),
    clearsWithinProjection: !hitsPayoffHorizon(result),
  };

/**
 * Build the structured context sent alongside the user's question.
 * Returns null-free, JSON-serializable data — no functions, no NaN.
 */
export const buildAdvisorContext = (profile) => {
  const summary = deriveSummary(profile);
  const metrics = deriveMetrics(summary);
  const healthScore = calculateHealthScore(summary);
  const completeness = profileCompleteness(profile);

  const validDebts = filterValidDebts(profile.debts).slice(0, MAX_LIST_ITEMS);
  const unpayable = findUnpayableDebts(profile.debts);
  const unpayableNames = new Set(unpayable.map((debt) => debt.name));
  const payoff = calculateMultipleDebts(profile.debts, null, summary);

  const liquidTotal = profile.assets
    .filter((asset) => LIQUID_ASSET_TYPES.includes(asset.type))
    .reduce((total, asset) => total + toNumber(asset.balance), 0);

  return {
    metrics: {
      monthlyIncome: money(metrics.income),
      monthlyExpenses: money(metrics.expenses),
      monthlySurplus: money(metrics.monthlySurplus),
      savingsRatePct: round(metrics.savingsRate, percent),
      debtToIncomePct: round(metrics.debtToIncomeRatio, percent),
      emergencyFundMonths: round(metrics.emergencyMonths, percent),
      liquidSavings: money(liquidTotal || metrics.savings),
      totalDebt: money(metrics.debts),
      netWorth: money(metrics.netWorth),
    },

    healthScore: healthScore && {
      total: healthScore.total,
      rating: getScoreRating(healthScore.total).rating,
      components: [
        { name: 'Savings rate', score: healthScore.savingsRate.score, max: healthScore.savingsRate.max },
        { name: 'Debt to income', score: healthScore.debtRatio.score, max: healthScore.debtRatio.max },
        { name: 'Emergency fund', score: healthScore.emergencyFund.score, max: healthScore.emergencyFund.max },
      ],
    },

    debts: validDebts.map((debt) => ({
      name: debt.name || 'Unnamed debt',
      type: debt.type || 'other',
      balance: money(toNumber(debt.balance)),
      aprPct: round(toNumber(debt.interestRate), percent),
      minPayment: money(toNumber(debt.minPayment)),
      neverPaidOffAtMinimum: unpayableNames.has(debt.name || 'This debt'),
    })),

    debtPayoff: payoff && {
      extraPayment: money(payoff.scenarios[0].extraPayment),
      recommendedExtraPayment: money(payoff.recommendedExtra),
      avalanche: payoffSummary(payoff.scenarios[0].avalanche),
      snowball: payoffSummary(payoff.scenarios[0].snowball),
      atRecommendedPayment: payoffSummary(payoff.recommended.avalanche),
    },

    goals: profile.goals
      .filter((goal) => goal.name || goal.targetAmount)
      .slice(0, MAX_LIST_ITEMS)
      .map((goal) => ({
        name: goal.name || goal.type,
        type: goal.type,
        targetAmount: money(toNumber(goal.targetAmount)),
        targetDate: goal.targetDate || null,
      })),

    protectionGaps: getProtectionChecks(profile)
      .filter((check) => check.status === STATUS.GAP)
      .map((check) => check.label),

    // What the advisor should ask for rather than assume.
    missing: completeness.sections.filter((section) => !section.complete).map((section) => section.label),
    completenessPct: completeness.percent,
  };
};
