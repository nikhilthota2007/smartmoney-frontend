/**
 * The landing page's money facts. Survey figures are quoted with their
 * source; worked examples are computed by the same planner the advisor uses,
 * so the numbers on the page cannot drift from the app's own math.
 */
import { calculateStrategy } from '../../lib/planner/debt';
import { projectSavings } from '../../lib/planner/projection';

export const CARD_EXAMPLE = { balance: 5000, apr: 24, slow: 150, fast: 250 };
export const SAVINGS_EXAMPLE = { monthly: 100, years: 10 };

const payoff = (payment) =>
  calculateStrategy(
    [{ name: 'Card', balance: String(CARD_EXAMPLE.balance), interestRate: String(CARD_EXAMPLE.apr), minPayment: String(payment) }],
    0,
    'avalanche'
  );

/** The worked examples, from the planner. */
export const buildFacts = () => ({
  slow: payoff(CARD_EXAMPLE.slow),
  fast: payoff(CARD_EXAMPLE.fast),
  savings: projectSavings({ monthlyContribution: SAVINGS_EXAMPLE.monthly, months: SAVINGS_EXAMPLE.years * 12 }),
});

/** Published figures, with where they come from. */
export const SURVEY_FACTS = [
  {
    key: 'emergency',
    value: 37,
    decimals: 0,
    prefix: '',
    suffix: '%',
    label: 'of US adults couldn’t cover a surprise $400 bill with cash or savings.',
    source: 'Federal Reserve, Economic Well-Being of U.S. Households in 2025',
    href: 'https://www.federalreserve.gov/publications/2026-economic-well-being-of-us-households-in-2025-executive-summary.htm',
  },
  {
    key: 'cards',
    value: 1.29,
    decimals: 2,
    prefix: '$',
    suffix: '',
    unit: 'trillion',
    label: 'owed on US credit cards, a record high. Carrying a balance is common, not a character flaw.',
    source: 'New York Fed, Household Debt and Credit Report, Q3 2026',
    href: 'https://www.newyorkfed.org/newsevents/news/research/2026/20261110',
  },
];
