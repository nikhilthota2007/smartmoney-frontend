import { DEFAULT_ANNUAL_RETURN_PCT, projectSavings } from '../planner/projection';
import { MAX_HORIZON_MONTHS } from '../planner/goals';

describe('projectSavings', () => {
  it('compounds monthly and adds each contribution', () => {
    // $1000 at 12%/yr = 1% a month, plus $100 each month, for 2 months:
    // 1000*1.01 + 100 = 1110; 1110*1.01 + 100 = 1221.10
    const result = projectSavings({
      initialAmount: 1000, monthlyContribution: 100, months: 2, annualReturnPct: 12,
    });

    expect(result.finalBalance).toBe(1221.1);
    expect(result.totalContributed).toBe(200);
    expect(result.growth).toBe(21.1);
  });

  it('handles a zero return as plain saving', () => {
    const result = projectSavings({
      initialAmount: 500, monthlyContribution: 100, months: 12, annualReturnPct: 0,
    });

    expect(result.finalBalance).toBe(1700);
    expect(result.growth).toBe(0);
  });

  it('returns the starting balance for a zero-month projection', () => {
    const result = projectSavings({ initialAmount: 5000, monthlyContribution: 300, months: 0 });

    expect(result.finalBalance).toBe(5000);
    expect(result.totalContributed).toBe(0);
  });

  it('states the return assumption for the answer to quote', () => {
    const result = projectSavings({ months: 12 });

    expect(result.annualReturnPct).toBe(DEFAULT_ANNUAL_RETURN_PCT);
    expect(result.assumption).toContain('not guaranteed');
  });

  it('caps the horizon rather than looping forever', () => {
    expect(projectSavings({ months: 99999, monthlyContribution: 1 }).months).toBe(MAX_HORIZON_MONTHS);
  });

  it('treats a negative horizon as zero', () => {
    expect(projectSavings({ initialAmount: 100, months: -5 }).months).toBe(0);
  });

  it('never returns NaN for missing inputs', () => {
    const result = projectSavings({});

    expect(Number.isFinite(result.finalBalance)).toBe(true);
    expect(Number.isFinite(result.growth)).toBe(true);
  });
});
