/**
 * The financial profile schema.
 *
 * v1 (shipped) was five loose strings held in component state and lost on
 * refresh. v2 keeps those five as `summary` and adds the structured sections
 * the planner needs. Sections fill in progressively; nothing here is required.
 *
 * Once a structured section carries real values it supersedes the matching
 * `summary` field — see deriveSummary below.
 */
import { toNumber } from './derive';

export const SCHEMA_VERSION = 2;

export const DEBT_TYPES = ['card', 'student', 'auto', 'mortgage', 'personal', 'medical', 'other'];
export const ASSET_TYPES = ['checking', 'savings', 'hysa', 'brokerage', '401k', 'ira', 'hsa', 'property', 'other'];
export const GOAL_TYPES = ['emergency', 'debt', 'purchase', 'education', 'retirement', 'custom'];
export const INCOME_STABILITY = ['stable', 'variable', 'seasonal'];

/** Expense categories the budgeting logic can reason about. */
export const FIXED_EXPENSE_CATEGORIES = ['housing', 'utilities', 'insurance', 'transport', 'subscriptions', 'childcare', 'debt payments', 'other'];
export const VARIABLE_EXPENSE_CATEGORIES = ['groceries', 'dining', 'transport', 'shopping', 'entertainment', 'health', 'other'];

/** Asset types that count toward the emergency fund. A 401k is not savings you can reach. */
export const LIQUID_ASSET_TYPES = ['checking', 'savings', 'hysa'];
/** Asset types that represent retirement saving. */
export const RETIREMENT_ASSET_TYPES = ['401k', 'ira'];

export const createEmptyDebt = (id = 1) => ({
  id, name: '', type: 'card', balance: '', interestRate: '', minPayment: '',
});

export const createEmptyIncome = (id = 1) => ({
  id, source: '', netMonthly: '', stability: 'stable',
});

export const createEmptyExpense = (id = 1) => ({
  id, category: '', amount: '',
});

export const createEmptyAsset = (id = 1) => ({
  id, name: '', type: 'savings', balance: '', monthlyContribution: '', employerMatchPct: '',
});

export const createEmptyGoal = (id = 1) => ({
  id, name: '', type: 'custom', targetAmount: '', targetDate: '', priority: 'medium',
});

/**
 * Every repeating section, addressed by a single key.
 * The reducer and the wizard both drive off this map rather than repeating
 * near-identical add/update/remove logic six times.
 */
export const LIST_SECTIONS = {
  income: { path: ['income'], factory: createEmptyIncome },
  fixedExpenses: { path: ['expenses', 'fixed'], factory: createEmptyExpense },
  variableExpenses: { path: ['expenses', 'variable'], factory: createEmptyExpense },
  debts: { path: ['debts'], factory: createEmptyDebt },
  assets: { path: ['assets'], factory: createEmptyAsset },
  goals: { path: ['goals'], factory: createEmptyGoal },
};

export const getSectionList = (profile, section) =>
  LIST_SECTIONS[section].path.reduce((node, key) => node?.[key], profile) || [];

export const createEmptyProfile = () => ({
  schemaVersion: SCHEMA_VERSION,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),

  // The five headline figures, entered directly. Superseded per-field by the
  // structured sections below as the user fills them in.
  summary: {
    monthlyIncome: '', monthlyExpenses: '', savings: '', debts: '', goals: '',
  },

  household: { filingStatus: '', dependents: '', state: '', birthYear: '' },
  income: [],
  expenses: { fixed: [], variable: [] },
  debts: [],
  assets: [],
  protection: {
    emergencyFundTarget: '',
    insurance: { health: false, life: false, disability: false, renters: false },
  },
  riskProfile: { toleranceScore: null, horizonYears: '', questionnaireAnswers: [] },
  goals: [],
});

/**
 * Bring any stored profile up to the current schema.
 *
 * Accepts a v2 profile, a bare v1 object (the five flat fields), or junk.
 * Always returns a complete, current-version profile — callers never have to
 * null-check a section.
 */
export const migrateProfile = (stored) => {
  const base = createEmptyProfile();
  if (!stored || typeof stored !== 'object') return base;

  // v1: the five flat fields, no schemaVersion.
  if (!stored.schemaVersion) {
    return {
      ...base,
      createdAt: stored.createdAt || base.createdAt,
      summary: {
        monthlyIncome: stored.monthlyIncome ?? '',
        monthlyExpenses: stored.monthlyExpenses ?? '',
        savings: stored.savings ?? '',
        debts: stored.debts ?? '',
        goals: stored.goals ?? '',
      },
    };
  }

  // v2 or newer: merge section by section so a partial or truncated record
  // still yields a usable profile.
  const list = (value, fallback) => (Array.isArray(value) ? value : fallback);
  return {
    ...base,
    ...stored,
    schemaVersion: SCHEMA_VERSION,
    summary: { ...base.summary, ...(stored.summary || {}) },
    household: { ...base.household, ...(stored.household || {}) },
    expenses: {
      fixed: list(stored.expenses?.fixed, base.expenses.fixed),
      variable: list(stored.expenses?.variable, base.expenses.variable),
    },
    protection: {
      ...base.protection,
      ...(stored.protection || {}),
      insurance: { ...base.protection.insurance, ...((stored.protection || {}).insurance || {}) },
    },
    riskProfile: { ...base.riskProfile, ...(stored.riskProfile || {}) },
    debts: list(stored.debts, base.debts),
    income: list(stored.income, base.income),
    assets: list(stored.assets, base.assets),
    goals: list(stored.goals, base.goals),
  };
};

const sumField = (items, field) => items.reduce((total, item) => total + toNumber(item[field]), 0);

/** A goals list rendered as the one-line description the advisor prompt expects. */
export const describeGoals = (goals) =>
  goals
    .filter((goal) => goal.name || goal.targetAmount)
    .map((goal) => {
      const name = goal.name || goal.type;
      const amount = toNumber(goal.targetAmount) > 0 ? ` ($${goal.targetAmount}` : '';
      const by = amount && goal.targetDate ? ` by ${goal.targetDate})` : amount ? ')' : '';
      return `${name}${amount}${by}`;
    })
    .join('; ');

/**
 * The five headline figures, preferring structured data over hand-entered ones.
 *
 * A structured section only wins once it totals more than zero, so a wizard the
 * user has opened but not filled in cannot blank out figures they typed on the
 * old form.
 */
export const deriveSummary = (profile) => {
  const { summary } = profile;
  const preferred = (total, fallback) => (total > 0 ? String(total) : fallback);

  const liquid = profile.assets.filter((asset) => LIQUID_ASSET_TYPES.includes(asset.type));
  const expenseTotal = sumField(profile.expenses.fixed, 'amount') + sumField(profile.expenses.variable, 'amount');
  const goalText = describeGoals(profile.goals);

  return {
    monthlyIncome: preferred(sumField(profile.income, 'netMonthly'), summary.monthlyIncome),
    monthlyExpenses: preferred(expenseTotal, summary.monthlyExpenses),
    savings: preferred(sumField(liquid, 'balance'), summary.savings),
    debts: preferred(sumField(profile.debts, 'balance'), summary.debts),
    goals: goalText || summary.goals,
  };
};

/** The shape the health score and the chat API consume. */
export const toFinancialData = (profile) => deriveSummary(profile);

const hasValue = (items, field) => items.some((item) => toNumber(item[field]) > 0);

/**
 * How much of the profile is filled in, and what to do next.
 * Weights reflect how much each section unlocks, not how many fields it has.
 */
export const profileCompleteness = (profile) => {
  const summary = deriveSummary(profile);

  const sections = [
    {
      key: 'income',
      label: 'Income',
      weight: 25,
      complete: toNumber(summary.monthlyIncome) > 0,
      hint: 'Add your income to unlock your health score',
    },
    {
      key: 'expenses',
      label: 'Expenses',
      weight: 25,
      complete: toNumber(summary.monthlyExpenses) > 0,
      hint: 'Add your expenses to see your savings rate',
    },
    {
      key: 'debts',
      label: 'Debts',
      weight: 20,
      complete: hasValue(profile.debts, 'balance') || toNumber(summary.debts) > 0,
      hint: 'Add your debts to unlock the payoff plan',
    },
    {
      key: 'assets',
      label: 'Savings',
      weight: 20,
      complete: hasValue(profile.assets, 'balance') || toNumber(summary.savings) > 0,
      hint: 'Add your savings to see your emergency fund runway',
    },
    {
      key: 'goals',
      label: 'Goals',
      weight: 10,
      complete: Boolean(summary.goals),
      hint: 'Add a goal so the advisor knows what you are working toward',
    },
  ];

  const percent = sections.reduce((total, s) => total + (s.complete ? s.weight : 0), 0);
  const nextIncomplete = sections.find((s) => !s.complete);

  return { percent, sections, nextAction: nextIncomplete ? nextIncomplete.hint : null };
};
