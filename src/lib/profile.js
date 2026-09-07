/**
 * The financial profile schema.
 *
 * v1 (shipped) was five loose strings held in component state and lost on
 * refresh. v2 keeps those five as `summary` — they still drive the health
 * score and the chat payload — and adds the structured sections the planner
 * needs. Sections fill in progressively; nothing here is required.
 */

export const SCHEMA_VERSION = 2;

export const DEBT_TYPES = ['card', 'student', 'auto', 'mortgage', 'personal', 'medical', 'other'];
export const ASSET_TYPES = ['checking', 'savings', 'hysa', 'brokerage', '401k', 'ira', 'hsa', 'property', 'other'];
export const GOAL_TYPES = ['emergency', 'debt', 'purchase', 'education', 'retirement', 'custom'];

/** Expense categories the budgeting logic can reason about. */
export const FIXED_EXPENSE_CATEGORIES = ['housing', 'utilities', 'insurance', 'transport', 'subscriptions', 'childcare', 'other'];
export const VARIABLE_EXPENSE_CATEGORIES = ['groceries', 'dining', 'transport', 'shopping', 'entertainment', 'health', 'other'];

export const createEmptyDebt = (id = 1) => ({
  id,
  name: '',
  type: 'card',
  balance: '',
  interestRate: '',
  minPayment: '',
});

export const createEmptyProfile = () => ({
  schemaVersion: SCHEMA_VERSION,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),

  // The five headline figures. Still the source of truth for the health
  // score and the chat context until the wizard lands in Phase 1.
  summary: {
    monthlyIncome: '',
    monthlyExpenses: '',
    savings: '',
    debts: '',
    goals: '',
  },

  household: { filingStatus: '', dependents: '', state: '', birthYear: '' },
  income: [],
  expenses: { fixed: [], variable: [] },
  debts: [{ ...createEmptyDebt(1), name: 'Credit Card' }],
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
  return {
    ...base,
    ...stored,
    schemaVersion: SCHEMA_VERSION,
    summary: { ...base.summary, ...(stored.summary || {}) },
    household: { ...base.household, ...(stored.household || {}) },
    expenses: { ...base.expenses, ...(stored.expenses || {}) },
    protection: {
      ...base.protection,
      ...(stored.protection || {}),
      insurance: { ...base.protection.insurance, ...((stored.protection || {}).insurance || {}) },
    },
    riskProfile: { ...base.riskProfile, ...(stored.riskProfile || {}) },
    debts: Array.isArray(stored.debts) && stored.debts.length ? stored.debts : base.debts,
    income: Array.isArray(stored.income) ? stored.income : base.income,
    assets: Array.isArray(stored.assets) ? stored.assets : base.assets,
    goals: Array.isArray(stored.goals) ? stored.goals : base.goals,
  };
};

/**
 * The shape the health score and the chat API consume.
 * One conversion point, so a schema change never has to touch either.
 */
export const toFinancialData = (profile) => ({ ...profile.summary });
