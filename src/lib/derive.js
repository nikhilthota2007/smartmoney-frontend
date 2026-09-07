/**
 * Derived financial metrics.
 *
 * Single source of truth: the health score, the planner and (later) the AI
 * context builder all read their numbers from here, so the chat can never
 * contradict the dashboard.
 */

/** Parse a form value that may be '', undefined or a numeric string. */
export const toNumber = (value) => parseFloat(value) || 0;

/**
 * Compute every derived metric from a legacy five-field financial snapshot.
 * Pure: no rounding, no formatting, no thresholds.
 */
export const deriveMetrics = (data = {}) => {
  const income = toNumber(data.monthlyIncome);
  const expenses = toNumber(data.monthlyExpenses);
  const savings = toNumber(data.savings);
  const debts = toNumber(data.debts);

  const annualIncome = income * 12;
  const monthlySurplus = income - expenses;

  return {
    income,
    expenses,
    savings,
    debts,
    annualIncome,
    monthlySurplus,
    // Share of income left over each month, as a percentage.
    savingsRate: income !== 0 ? (monthlySurplus / income) * 100 : 0,
    // Total debt as a percentage of annual income.
    debtToIncomeRatio: annualIncome > 0 ? (debts / annualIncome) * 100 : 0,
    // How many months of expenses current savings would cover.
    emergencyMonths: expenses > 0 ? savings / expenses : 0,
    netWorth: savings - debts,
  };
};
