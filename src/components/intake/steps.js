import {
  ASSET_TYPES,
  DEBT_TYPES,
  FIXED_EXPENSE_CATEGORIES,
  GOAL_TYPES,
  INCOME_STABILITY,
  VARIABLE_EXPENSE_CATEGORIES,
} from '../../lib/profile';

/**
 * The wizard, declared as data.
 *
 * Each step names the profile sections it edits and the columns to show for
 * each. WizardShell renders them; adding a step means adding an entry here.
 */
export const WIZARD_STEPS = [
  {
    key: 'income',
    title: 'What comes in',
    subtitle: 'Take-home pay after tax, plus anything else you earn each month.',
    lists: [
      {
        section: 'income',
        addLabel: 'Add income source',
        emptyMessage: 'No income sources yet.',
        fields: [
          { name: 'source', label: 'Source', placeholder: 'Salary' },
          { name: 'netMonthly', label: 'Net monthly', type: 'number', prefix: '$', placeholder: '4200' },
          { name: 'stability', label: 'Stability', type: 'select', options: INCOME_STABILITY },
        ],
      },
    ],
  },
  {
    key: 'expenses',
    title: 'What goes out',
    subtitle: 'Fixed costs are the same every month. Variable ones are your best estimate of the average.',
    lists: [
      {
        section: 'fixedExpenses',
        heading: 'Fixed',
        addLabel: 'Add fixed expense',
        emptyMessage: 'No fixed expenses yet.',
        fields: [
          { name: 'category', label: 'Category', type: 'select', options: FIXED_EXPENSE_CATEGORIES },
          { name: 'amount', label: 'Monthly', type: 'number', prefix: '$', placeholder: '1500' },
        ],
      },
      {
        section: 'variableExpenses',
        heading: 'Variable',
        addLabel: 'Add variable expense',
        emptyMessage: 'No variable expenses yet.',
        fields: [
          { name: 'category', label: 'Category', type: 'select', options: VARIABLE_EXPENSE_CATEGORIES },
          { name: 'amount', label: 'Average monthly', type: 'number', prefix: '$', placeholder: '400' },
        ],
      },
    ],
  },
  {
    key: 'debts',
    title: 'What you owe',
    subtitle: 'Balance, rate and minimum payment for each debt. This is what the payoff planner runs on.',
    lists: [
      {
        section: 'debts',
        addLabel: 'Add debt',
        emptyMessage: 'No debts recorded. Leave this empty if you have none.',
        fields: [
          { name: 'name', label: 'Name', placeholder: 'Credit card' },
          { name: 'type', label: 'Type', type: 'select', options: DEBT_TYPES },
          { name: 'balance', label: 'Balance', type: 'number', prefix: '$', placeholder: '5000' },
          { name: 'interestRate', label: 'APR', type: 'number', suffix: '%', placeholder: '22.9' },
          { name: 'minPayment', label: 'Minimum', type: 'number', prefix: '$', placeholder: '150' },
        ],
      },
    ],
  },
  {
    key: 'assets',
    title: 'What you have',
    subtitle: 'Cash accounts set your emergency fund runway. Retirement accounts let us check your employer match.',
    lists: [
      {
        section: 'assets',
        addLabel: 'Add account',
        emptyMessage: 'No accounts yet.',
        fields: [
          { name: 'name', label: 'Name', placeholder: 'Savings' },
          { name: 'type', label: 'Type', type: 'select', options: ASSET_TYPES },
          { name: 'balance', label: 'Balance', type: 'number', prefix: '$', placeholder: '10000' },
          { name: 'monthlyContribution', label: 'Adding monthly', type: 'number', prefix: '$', placeholder: '200' },
          { name: 'employerMatchPct', label: 'Employer match', type: 'number', suffix: '%', placeholder: '4' },
        ],
      },
    ],
  },
  {
    key: 'goals',
    title: 'What you are working toward',
    subtitle: 'The advisor plans around these. A rough target and date is enough.',
    lists: [
      {
        section: 'goals',
        addLabel: 'Add goal',
        emptyMessage: 'No goals yet.',
        fields: [
          { name: 'name', label: 'Goal', placeholder: 'House down payment' },
          { name: 'type', label: 'Type', type: 'select', options: GOAL_TYPES },
          { name: 'targetAmount', label: 'Target', type: 'number', prefix: '$', placeholder: '60000' },
          { name: 'targetDate', label: 'By', type: 'month' },
        ],
      },
    ],
  },
];
