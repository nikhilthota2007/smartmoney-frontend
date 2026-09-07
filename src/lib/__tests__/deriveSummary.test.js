import { createEmptyProfile, deriveSummary, describeGoals, profileCompleteness } from '../profile';

const profileWith = (sections) => ({ ...createEmptyProfile(), ...sections });

describe('deriveSummary', () => {
  it('falls back to the hand-entered figures when nothing is itemized', () => {
    const profile = profileWith({
      summary: {
        monthlyIncome: '5000', monthlyExpenses: '3500',
        savings: '10000', debts: '5000', goals: 'Buy a house',
      },
    });

    expect(deriveSummary(profile)).toEqual({
      monthlyIncome: '5000', monthlyExpenses: '3500',
      savings: '10000', debts: '5000', goals: 'Buy a house',
    });
  });

  it('totals itemized income across sources', () => {
    const profile = profileWith({
      income: [
        { id: 1, source: 'Salary', netMonthly: '4200' },
        { id: 2, source: 'Freelance', netMonthly: '800' },
      ],
    });

    expect(deriveSummary(profile).monthlyIncome).toBe('5000');
  });

  it('adds fixed and variable expenses together', () => {
    const profile = profileWith({
      expenses: {
        fixed: [{ id: 1, category: 'housing', amount: '1800' }],
        variable: [{ id: 1, category: 'groceries', amount: '500' }],
      },
    });

    expect(deriveSummary(profile).monthlyExpenses).toBe('2300');
  });

  it('counts only reachable cash toward savings', () => {
    const profile = profileWith({
      assets: [
        { id: 1, name: 'Checking', type: 'checking', balance: '2000' },
        { id: 2, name: 'HYSA', type: 'hysa', balance: '8000' },
        { id: 3, name: '401k', type: '401k', balance: '95000' },
        { id: 4, name: 'House', type: 'property', balance: '400000' },
      ],
    });

    // Retirement and property are not an emergency fund.
    expect(deriveSummary(profile).savings).toBe('10000');
  });

  it('totals debt balances', () => {
    const profile = profileWith({
      debts: [
        { id: 1, name: 'Card', balance: '5000' },
        { id: 2, name: 'Car', balance: '15000' },
      ],
    });

    expect(deriveSummary(profile).debts).toBe('20000');
  });

  it('lets structured data override the hand-entered figure', () => {
    const profile = profileWith({
      summary: { ...createEmptyProfile().summary, monthlyIncome: '3000' },
      income: [{ id: 1, source: 'Salary', netMonthly: '6000' }],
    });

    expect(deriveSummary(profile).monthlyIncome).toBe('6000');
  });

  it('does not let a half-filled wizard blank out figures the user typed', () => {
    const profile = profileWith({
      summary: { ...createEmptyProfile().summary, monthlyIncome: '5000' },
      // Row added, nothing entered yet.
      income: [{ id: 1, source: '', netMonthly: '' }],
    });

    expect(deriveSummary(profile).monthlyIncome).toBe('5000');
  });
});

describe('describeGoals', () => {
  it('renders goals as a readable line for the advisor prompt', () => {
    expect(
      describeGoals([
        { id: 1, name: 'House deposit', targetAmount: '60000', targetDate: '2029-06' },
        { id: 2, name: 'Emergency fund', targetAmount: '15000', targetDate: '' },
      ])
    ).toBe('House deposit ($60000 by 2029-06); Emergency fund ($15000)');
  });

  it('skips blank rows', () => {
    expect(describeGoals([{ id: 1, name: '', targetAmount: '' }])).toBe('');
  });
});

describe('profileCompleteness', () => {
  it('reports zero and points at income first for an empty profile', () => {
    const completeness = profileCompleteness(createEmptyProfile());

    expect(completeness.percent).toBe(0);
    expect(completeness.nextAction).toMatch(/income/i);
  });

  it('credits sections as they are filled in', () => {
    const profile = profileWith({
      income: [{ id: 1, source: 'Salary', netMonthly: '5000' }],
    });

    expect(profileCompleteness(profile).percent).toBe(25);
    expect(profileCompleteness(profile).sections.find((s) => s.key === 'income').complete).toBe(true);
  });

  it('reaches 100 and stops nagging once everything is present', () => {
    const profile = profileWith({
      income: [{ id: 1, source: 'Salary', netMonthly: '5000' }],
      expenses: { fixed: [{ id: 1, category: 'housing', amount: '1500' }], variable: [] },
      debts: [{ id: 1, name: 'Card', balance: '5000' }],
      assets: [{ id: 1, name: 'Savings', type: 'savings', balance: '10000' }],
      goals: [{ id: 1, name: 'House', targetAmount: '60000' }],
    });

    const completeness = profileCompleteness(profile);
    expect(completeness.percent).toBe(100);
    expect(completeness.nextAction).toBeNull();
  });

  it('counts a legacy profile that only has the five figures', () => {
    const profile = profileWith({
      summary: {
        monthlyIncome: '5000', monthlyExpenses: '3500',
        savings: '10000', debts: '5000', goals: 'Buy a house',
      },
    });

    expect(profileCompleteness(profile).percent).toBe(100);
  });
});
