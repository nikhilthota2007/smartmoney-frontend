import { evaluateGoal, monthsUntil } from '../planner/goals';

const JAN_2026 = new Date(2026, 0, 15);

describe('monthsUntil', () => {
  it('counts whole months to a YYYY-MM target', () => {
    expect(monthsUntil('2026-07', JAN_2026)).toBe(6);
    expect(monthsUntil('2029-01', JAN_2026)).toBe(36);
  });

  it('accepts a full date', () => {
    expect(monthsUntil('2026-07-01', JAN_2026)).toBe(6);
  });

  it('is zero for the current month or the past, never negative', () => {
    expect(monthsUntil('2026-01', JAN_2026)).toBe(0);
    expect(monthsUntil('2020-01', JAN_2026)).toBe(0);
  });

  it('returns null for a missing or unparseable date', () => {
    expect(monthsUntil('', JAN_2026)).toBeNull();
    expect(monthsUntil('someday', JAN_2026)).toBeNull();
    expect(monthsUntil('2026-13', JAN_2026)).toBeNull();
  });
});

describe('evaluateGoal', () => {
  it('divides what is left by the months remaining', () => {
    const result = evaluateGoal(
      { targetAmount: 60000, targetDate: '2029-01', currentAmount: 6000, monthlySurplus: 2000 },
      JAN_2026
    );

    expect(result.remaining).toBe(54000);
    expect(result.monthsUntilTarget).toBe(36);
    expect(result.requiredMonthly).toBe(1500);
    expect(result.achievable).toBe(true);
    expect(result.shortfallPerMonth).toBe(0);
  });

  it('reports the monthly shortfall when the surplus falls short', () => {
    const result = evaluateGoal(
      { targetAmount: 60000, targetDate: '2029-01', monthlySurplus: 1000 },
      JAN_2026
    );

    expect(result.requiredMonthly).toBeCloseTo(1666.67, 2);
    expect(result.achievable).toBe(false);
    expect(result.shortfallPerMonth).toBeCloseTo(666.67, 2);
  });

  it('answers "how long?" when there is no deadline', () => {
    const result = evaluateGoal({ targetAmount: 12000, monthlySurplus: 500 }, JAN_2026);

    expect(result.monthsUntilTarget).toBeNull();
    expect(result.requiredMonthly).toBeNull();
    expect(result.monthsAtCurrentSurplus).toBe(24);
    expect(result.achievable).toBe(true);
  });

  it('is unreachable with no surplus and no deadline', () => {
    const result = evaluateGoal({ targetAmount: 12000, monthlySurplus: 0 }, JAN_2026);

    expect(result.achievable).toBe(false);
    expect(result.monthsAtCurrentSurplus).toBeNull();
  });

  it('treats an already-met goal as done', () => {
    const result = evaluateGoal(
      { targetAmount: 5000, currentAmount: 5000, monthlySurplus: 0, targetDate: '2027-01' },
      JAN_2026
    );

    expect(result.remaining).toBe(0);
    expect(result.achievable).toBe(true);
    expect(result.monthsAtCurrentSurplus).toBe(0);
  });

  it('handles a deadline in the current month rather than dividing by zero', () => {
    const result = evaluateGoal(
      { targetAmount: 5000, targetDate: '2026-01', monthlySurplus: 500 },
      JAN_2026
    );

    expect(result.monthsUntilTarget).toBe(0);
    expect(result.requiredMonthly).toBeNull();
    expect(Number.isFinite(result.remaining)).toBe(true);
  });

  it('flags a goal that takes longer than we model', () => {
    const result = evaluateGoal({ targetAmount: 1000000, monthlySurplus: 10 }, JAN_2026);

    expect(result.beyondHorizon).toBe(true);
    expect(result.monthsAtCurrentSurplus).toBeNull();
  });

  it('does not go backwards on a negative surplus', () => {
    const result = evaluateGoal(
      { targetAmount: 10000, targetDate: '2027-01', monthlySurplus: -300 },
      JAN_2026
    );

    expect(result.achievable).toBe(false);
    expect(result.shortfallPerMonth).toBeGreaterThan(0);
  });
});
