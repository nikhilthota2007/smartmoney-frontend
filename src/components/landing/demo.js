/**
 * The landing page's demo, computed rather than written down.
 *
 * A fixed profile runs through the same tools and planner the advisor uses,
 * so every figure on the landing page is a real result and the copy quoting
 * them cannot drift from the card showing them.
 */
import { createEmptyProfile, profileCompleteness, toFinancialData } from '../../lib/profile';
import { executeTool } from '../../lib/tools';
import { calculateMultipleDebts } from '../../lib/planner/debt';
import { calculateHealthScore, getScoreRating } from '../../lib/healthScore';
import { formatCurrency } from '../../lib/format';

export const DEMO_EXTRA = 150;

export const DEMO_PROFILE = {
  ...createEmptyProfile(),
  income: [{ id: 1, source: 'Paycheck', netMonthly: '3400', stability: 'stable' }],
  expenses: {
    fixed: [{ id: 1, category: 'housing', amount: '2100' }],
    variable: [{ id: 1, category: 'groceries', amount: '650' }],
  },
  debts: [
    { id: 1, name: 'Visa', type: 'card', balance: '4100', interestRate: '27.9', minPayment: '125' },
    { id: 2, name: 'Store card', type: 'card', balance: '2300', interestRate: '24.9', minPayment: '70' },
  ],
  assets: [{ id: 1, name: 'Savings', type: 'savings', balance: '900', monthlyContribution: '', employerMatchPct: '' }],
  goals: [],
};

const highestRate = Math.max(...DEMO_PROFILE.debts.map((debt) => parseFloat(debt.interestRate)));

/** Everything the landing page shows, from one profile. */
export const buildDemo = () => {
  const payoff = executeTool('simulate_debt_payoff', { extraPayment: DEMO_EXTRA }, DEMO_PROFILE);
  const strategies = calculateMultipleDebts(DEMO_PROFILE.debts, String(DEMO_EXTRA), toFinancialData(DEMO_PROFILE));
  const health = calculateHealthScore(toFinancialData(DEMO_PROFILE));

  return {
    payoff,
    strategy: strategies.scenarios[0].avalanche,
    slowest: Math.max(strategies.scenarios[0].avalanche.months, strategies.scenarios[0].snowball.months),
    health,
    rating: getScoreRating(health.total).rating,
    topRate: highestRate,
    completeness: profileCompleteness(DEMO_PROFILE),
    script: {
      greeting: 'Okay. Deep breath.',
      question: `I owe ${formatCurrency(payoff.totalDebt)} on two cards. Help.`,
      replies: [
        `${formatCurrency(payoff.totalDebt)} is a number, not a verdict.`,
        `Send your ${highestRate}% card an extra ${formatCurrency(DEMO_EXTRA)} a month.`,
      ],
    },
  };
};
