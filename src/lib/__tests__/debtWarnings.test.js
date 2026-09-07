import { PAYOFF_HORIZON_MONTHS, findUnpayableDebts, hitsPayoffHorizon, monthlyInterest } from '../planner/debtWarnings';
import { calculateStrategy } from '../planner/debt';

describe('monthlyInterest', () => {
  it('converts an annual rate to one month of interest', () => {
    expect(monthlyInterest({ balance: '20000', interestRate: '30' })).toBe(500);
  });
});

describe('findUnpayableDebts', () => {
  const runaway = { id: 1, name: 'Runaway Card', balance: '20000', interestRate: '29.99', minPayment: '50' };
  const healthy = { id: 2, name: 'Car Loan', balance: '15000', interestRate: '6.5', minPayment: '350' };

  it('identifies a debt whose minimum does not cover its interest', () => {
    const [found] = findUnpayableDebts([runaway]);

    expect(found.name).toBe('Runaway Card');
    expect(found.minPayment).toBe(50);
    expect(Math.round(found.interest)).toBe(500);
    expect(Math.round(found.shortfall)).toBe(450);
  });

  it('leaves ordinary debts alone', () => {
    expect(findUnpayableDebts([healthy])).toEqual([]);
  });

  it('picks the unpayable one out of a mixed list', () => {
    expect(findUnpayableDebts([healthy, runaway]).map((d) => d.name)).toEqual(['Runaway Card']);
  });

  it('ignores rows the user has not filled in', () => {
    expect(findUnpayableDebts([{ id: 1, name: '', balance: '', interestRate: '', minPayment: '' }])).toEqual([]);
  });

  it('names an unnamed debt so the warning still reads', () => {
    expect(findUnpayableDebts([{ ...runaway, name: '' }])[0].name).toBe('This debt');
  });

  it('treats interest exactly equal to the minimum as unpayable', () => {
    // $1000 at 12% accrues exactly $10/month.
    expect(findUnpayableDebts([
      { id: 1, name: 'Break even', balance: '1000', interestRate: '12', minPayment: '10' },
    ])).toHaveLength(1);
  });
});

describe('hitsPayoffHorizon', () => {
  it('is true for the runaway debt the simulation cannot clear', () => {
    const result = calculateStrategy(
      [{ id: 1, name: 'Runaway', balance: '20000', interestRate: '29.99', minPayment: '50' }],
      0,
      'avalanche'
    );

    expect(result.months).toBe(PAYOFF_HORIZON_MONTHS);
    expect(hitsPayoffHorizon(result)).toBe(true);
  });

  it('is false for a debt that gets paid off', () => {
    const result = calculateStrategy(
      [{ id: 1, name: 'Card', balance: '5000', interestRate: '22.99', minPayment: '150' }],
      100,
      'avalanche'
    );

    expect(hitsPayoffHorizon(result)).toBe(false);
  });

  it('is false for a missing result', () => {
    expect(hitsPayoffHorizon(undefined)).toBe(false);
  });
});
