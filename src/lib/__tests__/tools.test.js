import { LIMITS, TOOL_HANDLERS, TOOL_MANIFEST, executeTool } from '../tools';
import { createEmptyProfile } from '../profile';

const profile = () => ({
  ...createEmptyProfile(),
  income: [{ id: 1, source: 'Salary', netMonthly: '5000', stability: 'stable' }],
  expenses: { fixed: [{ id: 1, category: 'housing', amount: '3500' }], variable: [] },
  assets: [{ id: 1, name: 'Savings', type: 'savings', balance: '10000' }],
  debts: [{ id: 1, name: 'Card', type: 'card', balance: '5000', interestRate: '22.99', minPayment: '150' }],
});

describe('simulate_debt_payoff', () => {
  it('answers the question the precomputed context cannot', () => {
    const result = executeTool('simulate_debt_payoff', '{"extraPayment": 500}', profile());

    expect(result.extraPayment).toBe(500);
    expect(result.avalanche.months).toBeGreaterThan(0);
    expect(result.snowball).toBeDefined();
    expect(result.comparedToMinimumsOnly.monthsSaved).toBeGreaterThan(0);
    expect(result.comparedToMinimumsOnly.interestSaved).toBeGreaterThan(0);
  });

  it('is faster and cheaper with a bigger extra payment', () => {
    const small = executeTool('simulate_debt_payoff', '{"extraPayment": 100}', profile());
    const large = executeTool('simulate_debt_payoff', '{"extraPayment": 1000}', profile());

    expect(large.avalanche.months).toBeLessThan(small.avalanche.months);
    expect(large.avalanche.totalInterest).toBeLessThan(small.avalanche.totalInterest);
  });

  it('explains itself when there are no debts to model', () => {
    expect(executeTool('simulate_debt_payoff', '{"extraPayment": 100}', createEmptyProfile()).error)
      .toMatch(/has not entered any debts/i);
  });

  it('rejects a non-numeric payment rather than producing nonsense', () => {
    expect(executeTool('simulate_debt_payoff', '{"extraPayment": "lots"}', profile()).error)
      .toMatch(/must be a number/i);
  });

  it('clamps an absurd payment instead of hanging', () => {
    const result = executeTool('simulate_debt_payoff', '{"extraPayment": 999999999999}', profile());

    expect(result.extraPayment).toBe(LIMITS.maxExtraPayment);
    expect(result.avalanche.months).toBeGreaterThan(0);
  });

  it('treats a negative payment as zero', () => {
    expect(executeTool('simulate_debt_payoff', '{"extraPayment": -500}', profile()).extraPayment).toBe(0);
  });
});

describe('evaluate_goal', () => {
  it('uses the user\'s real surplus when the model does not supply one', () => {
    const result = executeTool(
      'evaluate_goal',
      '{"goalName": "House", "targetAmount": 60000, "targetDate": "2099-01"}',
      profile()
    );

    expect(result.goalName).toBe('House');
    expect(result.monthlySurplus).toBe(1500); // 5000 income - 3500 expenses
    expect(result.targetAmount).toBe(60000);
  });

  it('accepts an explicit surplus for a what-if', () => {
    const result = executeTool(
      'evaluate_goal',
      '{"targetAmount": 12000, "monthlySurplus": 1000}',
      profile()
    );

    expect(result.monthlySurplus).toBe(1000);
    expect(result.monthsAtCurrentSurplus).toBe(12);
  });

  it('rejects a missing or zero target', () => {
    expect(executeTool('evaluate_goal', '{}', profile()).error).toMatch(/positive dollar amount/i);
    expect(executeTool('evaluate_goal', '{"targetAmount": 0}', profile()).error).toMatch(/positive/i);
  });

  it('truncates an absurdly long goal name', () => {
    const result = executeTool(
      'evaluate_goal',
      JSON.stringify({ goalName: 'x'.repeat(500), targetAmount: 1000 }),
      profile()
    );

    expect(result.goalName).toHaveLength(100);
  });
});

describe('project_savings', () => {
  it('projects forward using the user\'s own figures by default', () => {
    const result = executeTool('project_savings', '{"months": 12}', profile());

    expect(result.months).toBe(12);
    expect(result.initialAmount).toBe(10000);
    expect(result.monthlyContribution).toBe(1500);
    expect(result.finalBalance).toBeGreaterThan(result.initialAmount);
  });

  it('accepts explicit overrides', () => {
    const result = executeTool(
      'project_savings',
      '{"initialAmount": 0, "monthlyContribution": 500, "months": 24, "annualReturnPct": 0}',
      profile()
    );

    expect(result.finalBalance).toBe(12000);
  });

  it('requires a horizon', () => {
    expect(executeTool('project_savings', '{}', profile()).error).toMatch(/months must be/i);
  });

  it('clamps an implausible return rather than promising it', () => {
    expect(executeTool('project_savings', '{"months": 12, "annualReturnPct": 500}', profile()).annualReturnPct)
      .toBe(LIMITS.maxAnnualReturnPct);
  });

  it('always states its assumption', () => {
    expect(executeTool('project_savings', '{"months": 6}', profile()).assumption).toContain('not guaranteed');
  });
});

describe('executeTool is a hostile boundary', () => {
  it('reports an unknown tool and lists the real ones', () => {
    const result = executeTool('drain_bank_account', '{}', profile());

    expect(result.error).toMatch(/Unknown tool/);
    expect(result.error).toContain('simulate_debt_payoff');
  });

  it('reports unparseable arguments', () => {
    expect(executeTool('project_savings', '{not json', profile()).error).toMatch(/not valid JSON/i);
  });

  it('rejects arguments that are not an object', () => {
    expect(executeTool('project_savings', '[1,2,3]', profile()).error).toMatch(/must be a JSON object/i);
    expect(executeTool('project_savings', '"a string"', profile()).error).toMatch(/must be a JSON object/i);
  });

  it('accepts already-parsed arguments as well as a JSON string', () => {
    expect(executeTool('project_savings', { months: 6 }, profile()).months).toBe(6);
  });

  it('treats missing arguments as an empty object', () => {
    expect(executeTool('project_savings', '', profile()).error).toMatch(/months must be/i);
  });

  it('never throws, whatever it is handed', () => {
    const nasty = ['null', 'true', '{"months": {"nested": true}}', '{"extraPayment": [1,2]}'];

    nasty.forEach((args) => {
      expect(() => executeTool('project_savings', args, profile())).not.toThrow();
      expect(() => executeTool('simulate_debt_payoff', args, profile())).not.toThrow();
    });
  });

  it('turns a handler failure into a readable error', () => {
    expect(executeTool('simulate_debt_payoff', '{"extraPayment": 100}', {}).error).toMatch(/calculation failed/i);
  });

  it('returns JSON-serializable results, since they go back to the model', () => {
    const result = executeTool('simulate_debt_payoff', '{"extraPayment": 200}', profile());
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('NaN');
    expect(JSON.parse(serialized)).toEqual(result);
  });
});

describe('the manifest matches what is implemented', () => {
  it('lists exactly the handlers that exist', () => {
    expect(TOOL_MANIFEST.map((tool) => tool.name).sort()).toEqual(Object.keys(TOOL_HANDLERS).sort());
  });
});
