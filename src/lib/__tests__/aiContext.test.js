import { MAX_LIST_ITEMS, buildAdvisorContext } from '../aiContext';
import { createEmptyProfile } from '../profile';

const profileWith = (sections) => ({ ...createEmptyProfile(), ...sections });

const fullProfile = () =>
  profileWith({
    income: [{ id: 1, source: 'Salary', netMonthly: '5000', stability: 'stable' }],
    expenses: { fixed: [{ id: 1, category: 'housing', amount: '3500' }], variable: [] },
    assets: [
      { id: 1, name: 'Savings', type: 'savings', balance: '10000' },
      { id: 2, name: '401k', type: '401k', balance: '95000' },
    ],
    debts: [{ id: 1, name: 'Card', type: 'card', balance: '5000', interestRate: '22.99', minPayment: '150' }],
    goals: [{ id: 1, name: 'House', type: 'purchase', targetAmount: '60000', targetDate: '2029-06' }],
  });

describe('metrics', () => {
  it('carries the figures the dashboard shows', () => {
    const { metrics } = buildAdvisorContext(fullProfile());

    expect(metrics.monthlyIncome).toBe(5000);
    expect(metrics.monthlyExpenses).toBe(3500);
    expect(metrics.monthlySurplus).toBe(1500);
    expect(metrics.savingsRatePct).toBe(30);
    expect(metrics.totalDebt).toBe(5000);
  });

  it('rounds so the model has nothing ugly to quote back', () => {
    // 5000/12/5000 debt ratio is 8.333333333333332 unrounded.
    const { metrics } = buildAdvisorContext(fullProfile());

    expect(metrics.debtToIncomePct).toBe(8.3);
    expect(metrics.emergencyFundMonths).toBe(2.9);
  });

  it('counts only reachable cash as savings, not the 401k', () => {
    expect(buildAdvisorContext(fullProfile()).metrics.liquidSavings).toBe(10000);
  });
});

describe('health score', () => {
  it('sends the same score the modal shows', () => {
    const { healthScore } = buildAdvisorContext(fullProfile());

    expect(healthScore.total).toBe(75); // pinned by the characterization fixtures
    expect(healthScore.rating).toBe('Good');
    expect(healthScore.components).toHaveLength(3);
  });

  it('is null when there is no income to score', () => {
    expect(buildAdvisorContext(createEmptyProfile()).healthScore).toBeNull();
  });
});

describe('debts', () => {
  it('itemizes each debt with its own terms', () => {
    const [debt] = buildAdvisorContext(fullProfile()).debts;

    expect(debt).toEqual({
      name: 'Card',
      type: 'card',
      balance: 5000,
      aprPct: 23,
      minPayment: 150,
      neverPaidOffAtMinimum: false,
    });
  });

  it('marks a debt whose minimum never covers its interest', () => {
    const profile = profileWith({
      debts: [{ id: 1, name: 'Runaway', type: 'card', balance: '20000', interestRate: '29.99', minPayment: '50' }],
    });

    expect(buildAdvisorContext(profile).debts[0].neverPaidOffAtMinimum).toBe(true);
  });

  it('drops rows the user has not filled in', () => {
    const profile = profileWith({
      debts: [{ id: 1, name: 'Blank', balance: '', interestRate: '', minPayment: '' }],
    });

    expect(buildAdvisorContext(profile).debts).toEqual([]);
  });

  it('includes payoff timelines so the model never has to compute one', () => {
    const { debtPayoff } = buildAdvisorContext(fullProfile());

    expect(debtPayoff.avalanche.months).toBeGreaterThan(0);
    expect(debtPayoff.avalanche.totalInterest).toBeGreaterThan(0);
    expect(debtPayoff.avalanche.clearsWithinProjection).toBe(true);
    expect(debtPayoff.recommendedExtraPayment).toBeGreaterThan(0);
  });

  it('flags a payoff that runs past the projection horizon', () => {
    const profile = profileWith({
      debts: [{ id: 1, name: 'Runaway', type: 'card', balance: '20000', interestRate: '29.99', minPayment: '50' }],
    });

    expect(buildAdvisorContext(profile).debtPayoff.avalanche.clearsWithinProjection).toBe(false);
  });

  it('omits the payoff block entirely when there are no debts', () => {
    expect(buildAdvisorContext(createEmptyProfile()).debtPayoff).toBeNull();
  });
});

describe('goals, gaps and what is missing', () => {
  it('passes goals with their targets', () => {
    expect(buildAdvisorContext(fullProfile()).goals).toEqual([
      { name: 'House', type: 'purchase', targetAmount: 60000, targetDate: '2029-06' },
    ]);
  });

  it('lists coverage gaps by name', () => {
    expect(buildAdvisorContext(fullProfile()).protectionGaps).toContain('Health insurance');
  });

  it('tells the advisor what to ask for instead of assuming', () => {
    const context = buildAdvisorContext(profileWith({
      income: [{ id: 1, source: 'Salary', netMonthly: '5000' }],
    }));

    expect(context.missing).toEqual(expect.arrayContaining(['Expenses', 'Debts', 'Savings', 'Goals']));
    expect(context.missing).not.toContain('Income');
    expect(context.completenessPct).toBe(25);
  });

  it('reports everything missing for an empty profile', () => {
    const context = buildAdvisorContext(createEmptyProfile());

    expect(context.missing).toHaveLength(5);
    expect(context.completenessPct).toBe(0);
  });
});

describe('the context is safe to send', () => {
  it('survives an empty profile without throwing', () => {
    expect(() => buildAdvisorContext(createEmptyProfile())).not.toThrow();
  });

  it('serializes cleanly, with no NaN or undefined leaking through', () => {
    const serialized = JSON.stringify(buildAdvisorContext(fullProfile()));

    expect(serialized).not.toContain('NaN');
    expect(serialized).not.toContain('undefined');
    expect(JSON.parse(serialized)).toBeTruthy();
  });

  it('stays bounded no matter how much the user enters', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1, name: `Debt ${i}`, type: 'card', balance: '1000', interestRate: '10', minPayment: '50',
    }));
    const goals = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1, name: `Goal ${i}`, type: 'custom', targetAmount: '1000', targetDate: '',
    }));

    const context = buildAdvisorContext(profileWith({ debts: many, goals }));

    expect(context.debts).toHaveLength(MAX_LIST_ITEMS);
    expect(context.goals).toHaveLength(MAX_LIST_ITEMS);
  });
});
