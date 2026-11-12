import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { createEmptyProfile } from '../../../lib/profile';
import { executeTool } from '../../../lib/tools';
import PayoffCard from '../PayoffCard';
import GoalCard from '../GoalCard';
import ProjectionCard from '../ProjectionCard';
import ScoreDial from '../ScoreDial';
import { goalVerdict, STRETCH_SHARE } from '../verdict';
import { duration, money, monthLabel, shortDuration } from '../display';

const TODAY = new Date(2026, 10, 12); // 12 Nov 2026

/** Two cards, a modest surplus: the same shape as the landing demo. */
const profile = {
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
};

describe('display helpers', () => {
  it('formats months as calendar months from today', () => {
    expect(monthLabel(25, TODAY)).toBe('Dec 2028');
    expect(monthLabel(0, TODAY)).toBe('Nov 2026');
  });

  it('rounds headline money to whole dollars', () => {
    expect(money(3460.03)).toBe('$3,460');
    expect(money('150')).toBe('$150');
  });

  it('describes durations', () => {
    expect(duration(25)).toBe('2 years, 1 month');
    expect(duration(0)).toBe('Under a month');
    expect(shortDuration(23)).toBe('23 mo');
    expect(shortDuration(63)).toBe('5.3 yrs');
    expect(shortDuration(72)).toBe('6 yrs');
  });
});

describe('PayoffCard', () => {
  const result = executeTool('simulate_debt_payoff', { extraPayment: 150 }, profile);

  it('shows the figures the tool returned', () => {
    render(<PayoffCard result={result} today={TODAY} />);
    const card = screen.getByRole('article', { name: 'Payoff plan' });

    expect(within(card).getByText(monthLabel(result.avalanche.months, TODAY))).toBeInTheDocument();
    expect(within(card).getByText(String(result.comparedToMinimumsOnly.monthsSaved))).toBeInTheDocument();
    expect(within(card).getByText(money(result.comparedToMinimumsOnly.interestSaved))).toBeInTheDocument();
    expect(within(card).getByText(money(result.avalanche.totalInterest))).toBeInTheDocument();
    expect(within(card).getByText(money(result.avalanche.monthlyPayment))).toBeInTheDocument();
    expect(within(card).getByText('+$150/mo')).toBeInTheDocument();
  });

  it('matches the numbers quoted in the design plan', () => {
    expect(result.avalanche.months).toBe(25);
    expect(result.comparedToMinimumsOnly.monthsSaved).toBe(38);
    expect(money(result.comparedToMinimumsOnly.interestSaved)).toBe('$3,460');
  });

  it('compares against minimums only', () => {
    render(<PayoffCard result={result} today={TODAY} />);
    expect(screen.getByText('Minimums only')).toBeInTheDocument();
    expect(screen.getByText('With $150 extra')).toBeInTheDocument();
  });

  it('warns instead of dating a debt that never clears', () => {
    const stuck = executeTool('simulate_debt_payoff', { extraPayment: 0 }, {
      ...profile,
      debts: [{ id: 1, name: 'Runaway', balance: '20000', interestRate: '29.99', minPayment: '50' }],
    });
    render(<PayoffCard result={stuck} today={TODAY} />);

    expect(screen.getByText(/not cleared within 50 years/i)).toBeInTheDocument();
    expect(screen.queryByText('Debt-free by')).not.toBeInTheDocument();
  });

  it('renders nothing for a tool error', () => {
    const { container } = render(<PayoffCard result={{ error: 'no debts' }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('goalVerdict', () => {
  const base = { remaining: 2000, achievable: false, requiredMonthly: 400, monthlySurplus: 0 };

  it('reads the tool fields in order', () => {
    expect(goalVerdict({ ...base, remaining: 0 }).label).toBe('Already there');
    expect(goalVerdict({ ...base, achievable: true }).label).toBe('On track');
    expect(goalVerdict({ ...base, monthlySurplus: 400 * STRETCH_SHARE }).label).toBe('Stretch');
    expect(goalVerdict({ ...base, monthlySurplus: 400 * STRETCH_SHARE - 1 }).label).toBe('Off track');
  });

  it('calls a goal with no deadline and no surplus off track', () => {
    expect(goalVerdict({ ...base, requiredMonthly: null, monthlySurplus: -50 }).label).toBe('Off track');
  });

  it('has no verdict for an error', () => {
    expect(goalVerdict({ error: 'bad' })).toBeNull();
  });
});

describe('GoalCard', () => {
  it('shows an achievable goal as on track with what it needs', () => {
    const result = executeTool(
      'evaluate_goal',
      { goalName: 'Emergency fund', targetAmount: 3000, targetDate: '2027-12', currentAmount: 900 },
      profile
    );
    render(<GoalCard result={result} today={TODAY} />);
    const card = screen.getByRole('article', { name: 'Goal check' });

    expect(within(card).getByText('On track')).toBeInTheDocument();
    expect(within(card).getByText('Emergency fund')).toBeInTheDocument();
    expect(within(card).getByText(money(result.requiredMonthly))).toBeInTheDocument();
    expect(within(card).getByText(money(result.monthlySurplus))).toBeInTheDocument();
    expect(within(card).getByText('$900 saved of $3,000')).toBeInTheDocument();
  });

  it('shows the shortfall when the goal is out of reach', () => {
    const result = executeTool(
      'evaluate_goal',
      { goalName: 'House', targetAmount: 60000, targetDate: '2028-06', monthlySurplus: 650 },
      profile
    );
    render(<GoalCard result={result} today={TODAY} />);

    expect(screen.getByText('Off track')).toBeInTheDocument();
    expect(screen.getByText(`${money(result.shortfallPerMonth)}/mo`)).toBeInTheDocument();
  });
});

describe('ProjectionCard', () => {
  it('shows the final balance, its parts and the stated assumption', () => {
    const result = executeTool('project_savings', { monthlyContribution: 200, months: 24, initialAmount: 900 }, profile);
    render(<ProjectionCard result={result} />);
    const card = screen.getByRole('article', { name: 'Savings projection' });

    expect(within(card).getByText(money(result.finalBalance))).toBeInTheDocument();
    expect(within(card).getByText(money(result.totalContributed))).toBeInTheDocument();
    expect(within(card).getByText(money(result.growth))).toBeInTheDocument();
    expect(within(card).getByText(result.assumption)).toBeInTheDocument();
  });
});

describe('ScoreDial', () => {
  it('shows the score as its own piece of text', () => {
    render(<ScoreDial score={75} />);
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('out of 100')).toBeInTheDocument();
  });
});
