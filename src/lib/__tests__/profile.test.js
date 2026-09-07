import {
  SCHEMA_VERSION,
  createEmptyProfile,
  migrateProfile,
  toFinancialData,
} from '../profile';

describe('migrateProfile', () => {
  it('lifts a v1 record (five flat fields) into the v2 summary', () => {
    const v1 = {
      monthlyIncome: '5000',
      monthlyExpenses: '3500',
      savings: '10000',
      debts: '5000',
      goals: 'Buy a house',
    };
    const migrated = migrateProfile(v1);

    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated.summary).toEqual(v1);
    // Structured sections start empty; the wizard fills them in.
    expect(migrated.debts).toEqual([]);
    expect(migrated.expenses).toEqual({ fixed: [], variable: [] });
  });

  it('defaults missing v1 fields to empty strings rather than undefined', () => {
    const migrated = migrateProfile({ monthlyIncome: '4000' });
    expect(migrated.summary).toEqual({
      monthlyIncome: '4000',
      monthlyExpenses: '',
      savings: '',
      debts: '',
      goals: '',
    });
  });

  it('returns a complete profile for null, undefined and junk', () => {
    [null, undefined, 42, 'nonsense'].forEach((junk) => {
      expect(migrateProfile(junk).summary).toEqual(createEmptyProfile().summary);
    });
  });

  it('backfills sections missing from a truncated v2 record', () => {
    const partial = { schemaVersion: 2, summary: { monthlyIncome: '900' } };
    const migrated = migrateProfile(partial);

    expect(migrated.summary.monthlyIncome).toBe('900');
    expect(migrated.summary.goals).toBe('');
    expect(migrated.protection.insurance).toEqual({
      health: false,
      life: false,
      disability: false,
      renters: false,
    });
    expect(migrated.riskProfile).toBeDefined();
  });

  it('keeps stored v2 data instead of overwriting it with defaults', () => {
    const stored = {
      ...createEmptyProfile(),
      summary: { monthlyIncome: '7000', monthlyExpenses: '2000', savings: '1', debts: '2', goals: 'g' },
      debts: [{ id: 9, name: 'Auto', balance: '3000', interestRate: '5', minPayment: '90' }],
    };
    const migrated = migrateProfile(stored);

    expect(migrated.summary.monthlyIncome).toBe('7000');
    expect(migrated.debts).toEqual(stored.debts);
  });
});

describe('toFinancialData', () => {
  it('exposes exactly the five fields the score and chat API consume', () => {
    const profile = createEmptyProfile();
    profile.summary.monthlyIncome = '5000';

    expect(Object.keys(toFinancialData(profile)).sort()).toEqual([
      'debts',
      'goals',
      'monthlyExpenses',
      'monthlyIncome',
      'savings',
    ]);
  });

  it('returns a copy, so callers cannot mutate the profile through it', () => {
    const profile = createEmptyProfile();
    const data = toFinancialData(profile);
    data.monthlyIncome = '999';

    expect(profile.summary.monthlyIncome).toBe('');
  });
});
