/**
 * Cross-repo contract.
 *
 * advisorContext.contract.json holds a sample profile and the exact context
 * buildAdvisorContext produces from it. The backend repository keeps a copy of
 * the same context payload and asserts it deserializes into its FinancialContext
 * records with every field populated.
 *
 * If this test fails, the frontend changed the shape and the backend needs the
 * matching change. Regenerate the fixture deliberately, never to make the test
 * pass.
 */
import contract from '../__fixtures__/advisorContext.contract.json';
import toolsContract from '../__fixtures__/tools.contract.json';
import { buildAdvisorContext } from '../aiContext';
import { TOOL_HANDLERS, TOOL_MANIFEST } from '../tools';

describe('advisor context contract', () => {
  it('produces exactly the payload the backend is built against', () => {
    expect(buildAdvisorContext(contract.profile)).toEqual(contract.context);
  });

  it('names every field the backend reads', () => {
    expect(Object.keys(contract.context).sort()).toEqual([
      'completenessPct', 'debtPayoff', 'debts', 'goals',
      'healthScore', 'metrics', 'missing', 'protectionGaps',
    ]);
    expect(Object.keys(contract.context.metrics).sort()).toEqual([
      'debtToIncomePct', 'emergencyFundMonths', 'liquidSavings', 'monthlyExpenses',
      'monthlyIncome', 'monthlySurplus', 'netWorth', 'savingsRatePct', 'totalDebt',
    ]);
    expect(Object.keys(contract.context.debts[0]).sort()).toEqual([
      'aprPct', 'balance', 'minPayment', 'name', 'neverPaidOffAtMinimum', 'type',
    ]);
    expect(Object.keys(contract.context.debtPayoff.avalanche).sort()).toEqual([
      'clearsWithinProjection', 'monthlyPayment', 'months', 'totalInterest', 'totalPaid',
    ]);
  });
});

describe('tool contract', () => {
  it('publishes exactly the tools the backend declares to the model', () => {
    expect(TOOL_MANIFEST).toEqual(toolsContract.tools);
  });

  it('implements every tool in the contract', () => {
    toolsContract.tools.forEach((tool) => {
      expect(TOOL_HANDLERS[tool.name]).toBeInstanceOf(Function);
    });
    expect(Object.keys(TOOL_HANDLERS)).toHaveLength(toolsContract.tools.length);
  });
});
