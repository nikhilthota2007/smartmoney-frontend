/**
 * The tools the advisor can call.
 *
 * These execute here, in the browser, against the same financial logic that
 * drives the UI. The backend declares their schemas to the model and relays the
 * call requests, but never computes: a second implementation in Java could
 * disagree with this one, and the whole point of §5 of the plan is that there is
 * exactly one answer to any given money question.
 *
 * Arguments arrive from a language model, so nothing here trusts its input.
 * Every handler validates and clamps, and a bad call returns a structured error
 * the model can read and correct rather than throwing.
 */
import { deriveMetrics } from '../derive';
import { deriveSummary } from '../profile';
import { calculateMultipleDebts, filterValidDebts } from '../planner/debt';
import { hitsPayoffHorizon } from '../planner/debtWarnings';
import { evaluateGoal, MAX_HORIZON_MONTHS } from '../planner/goals';
import { DEFAULT_ANNUAL_RETURN_PCT, projectSavings } from '../planner/projection';

/** Upper bounds, so a hallucinated argument cannot hang the browser. */
export const LIMITS = {
  maxExtraPayment: 1_000_000,
  maxMonths: MAX_HORIZON_MONTHS,
  maxAmount: 100_000_000,
  maxAnnualReturnPct: 30,
};

const toolError = (message) => ({ error: message });

/**
 * Coerce a model-supplied value to a number within bounds.
 * Returns null when it is missing or unusable, so callers can report why.
 */
const boundedNumber = (value, { min = 0, max, fallback = null }) => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(Math.max(parsed, min), max);
};

const payoffShape = (result) =>
  result && {
    months: result.months,
    years: result.years,
    remainingMonths: result.remainingMonths,
    totalInterest: Math.round(result.totalInterest * 100) / 100,
    totalPaid: Math.round(result.totalPaid * 100) / 100,
    monthlyPayment: Math.round(result.monthlyPayment * 100) / 100,
    clearsWithinProjection: !hitsPayoffHorizon(result),
  };

/**
 * "What if I put an extra $500 a month at my debt?"
 * The one question the precomputed context cannot answer.
 */
const simulateDebtPayoff = (args, profile) => {
  const extraPayment = boundedNumber(args.extraPayment, { max: LIMITS.maxExtraPayment });
  if (extraPayment === null) {
    return toolError('extraPayment must be a number of dollars per month.');
  }
  if (filterValidDebts(profile.debts).length === 0) {
    return toolError('The user has not entered any debts with a balance, rate and minimum payment.');
  }

  const summary = deriveSummary(profile);
  const result = calculateMultipleDebts(profile.debts, String(extraPayment), summary);
  const baseline = calculateMultipleDebts(profile.debts, '0', summary);

  const avalanche = payoffShape(result.scenarios[0].avalanche);
  const baselineAvalanche = payoffShape(baseline.scenarios[0].avalanche);

  return {
    extraPayment,
    totalDebt: result.totalDebt,
    totalMinimumPayment: result.totalMinPayment,
    avalanche,
    snowball: payoffShape(result.scenarios[0].snowball),
    comparedToMinimumsOnly: {
      monthsSaved: baselineAvalanche.months - avalanche.months,
      interestSaved: Math.round((baselineAvalanche.totalInterest - avalanche.totalInterest) * 100) / 100,
    },
  };
};

/** "Can I have $60,000 by June 2029?" */
const evaluateGoalTool = (args, profile) => {
  const targetAmount = boundedNumber(args.targetAmount, { max: LIMITS.maxAmount });
  if (targetAmount === null || targetAmount === 0) {
    return toolError('targetAmount must be a positive dollar amount.');
  }

  const summary = deriveSummary(profile);
  const metrics = deriveMetrics(summary);
  const currentAmount = boundedNumber(args.currentAmount, { max: LIMITS.maxAmount, fallback: 0 }) ?? 0;
  const monthlySurplus =
    boundedNumber(args.monthlySurplus, { min: -LIMITS.maxAmount, max: LIMITS.maxAmount, fallback: null }) ??
    metrics.monthlySurplus;

  return {
    goalName: typeof args.goalName === 'string' ? args.goalName.slice(0, 100) : null,
    ...evaluateGoal({ targetAmount, targetDate: args.targetDate, currentAmount, monthlySurplus }),
  };
};

/** "What would saving $400 a month for 10 years come to?" */
const projectSavingsTool = (args, profile) => {
  const months = boundedNumber(args.months, { min: 1, max: LIMITS.maxMonths });
  if (months === null) {
    return toolError('months must be a whole number of months to project.');
  }

  const metrics = deriveMetrics(deriveSummary(profile));
  const monthlyContribution =
    boundedNumber(args.monthlyContribution, { max: LIMITS.maxAmount, fallback: null }) ??
    Math.max(0, metrics.monthlySurplus);
  const initialAmount =
    boundedNumber(args.initialAmount, { max: LIMITS.maxAmount, fallback: null }) ?? metrics.savings;
  const annualReturnPct =
    boundedNumber(args.annualReturnPct, { max: LIMITS.maxAnnualReturnPct, fallback: null }) ??
    DEFAULT_ANNUAL_RETURN_PCT;

  return projectSavings({ initialAmount, monthlyContribution, months, annualReturnPct });
};

export const TOOL_HANDLERS = {
  simulate_debt_payoff: simulateDebtPayoff,
  evaluate_goal: evaluateGoalTool,
  project_savings: projectSavingsTool,
};

/** Names and accepted arguments, shared with the backend as a contract. */
export const TOOL_MANIFEST = [
  { name: 'simulate_debt_payoff', parameters: ['extraPayment'] },
  { name: 'evaluate_goal', parameters: ['goalName', 'targetAmount', 'targetDate', 'currentAmount', 'monthlySurplus'] },
  { name: 'project_savings', parameters: ['initialAmount', 'monthlyContribution', 'months', 'annualReturnPct'] },
];

/**
 * Run one tool call. Never throws: an unknown name, unparseable arguments or a
 * failing handler all come back as `{ error }` for the model to read.
 */
export const executeTool = (name, rawArguments, profile) => {
  const handler = TOOL_HANDLERS[name];
  if (!handler) {
    return toolError(`Unknown tool "${name}". Available tools: ${Object.keys(TOOL_HANDLERS).join(', ')}.`);
  }

  let args;
  try {
    args = typeof rawArguments === 'string' ? JSON.parse(rawArguments || '{}') : rawArguments || {};
  } catch {
    return toolError('Arguments were not valid JSON.');
  }
  if (typeof args !== 'object' || Array.isArray(args)) {
    return toolError('Arguments must be a JSON object.');
  }

  try {
    return handler(args, profile);
  } catch (error) {
    return toolError(`The calculation failed: ${error.message}`);
  }
};
