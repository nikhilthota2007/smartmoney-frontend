import { profileReducer } from '../ProfileContext';
import { createEmptyProfile } from '../../lib/profile';

const base = () => createEmptyProfile();

describe('profileReducer', () => {
  it('updates a summary field without touching the others', () => {
    const next = profileReducer(base(), {
      type: 'SET_SUMMARY_FIELD',
      field: 'monthlyIncome',
      value: '5000',
    });

    expect(next.summary.monthlyIncome).toBe('5000');
    expect(next.summary.savings).toBe('');
  });

  it('adds an item with the next free id', () => {
    const profile = { ...base(), debts: [{ id: 1 }, { id: 4 }] };
    const next = profileReducer(profile, { type: 'ADD_ITEM', section: 'debts' });

    expect(next.debts).toHaveLength(3);
    expect(next.debts[2].id).toBe(5);
    expect(next.debts[2].name).toBe('');
  });

  it('removes an item by id', () => {
    const profile = { ...base(), debts: [{ id: 1 }, { id: 2 }] };
    const next = profileReducer(profile, { type: 'REMOVE_ITEM', section: 'debts', id: 1 });

    expect(next.debts).toEqual([{ id: 2 }]);
  });

  it('allows removing every row — having no debts is a real state', () => {
    const profile = { ...base(), debts: [{ id: 1 }] };
    const next = profileReducer(profile, { type: 'REMOVE_ITEM', section: 'debts', id: 1 });

    expect(next.debts).toEqual([]);
  });

  it('updates one field of one item', () => {
    const profile = { ...base(), debts: [{ id: 1, balance: '' }, { id: 2, balance: '' }] };
    const next = profileReducer(profile, {
      type: 'UPDATE_ITEM', section: 'debts', id: 2, field: 'balance', value: '900',
    });

    expect(next.debts[0].balance).toBe('');
    expect(next.debts[1].balance).toBe('900');
  });

  it('reaches nested sections such as expenses.fixed', () => {
    const added = profileReducer(base(), { type: 'ADD_ITEM', section: 'fixedExpenses' });
    expect(added.expenses.fixed).toHaveLength(1);
    expect(added.expenses.variable).toEqual([]);

    const updated = profileReducer(added, {
      type: 'UPDATE_ITEM', section: 'fixedExpenses', id: added.expenses.fixed[0].id,
      field: 'amount', value: '1500',
    });
    expect(updated.expenses.fixed[0].amount).toBe('1500');

    const removed = profileReducer(updated, {
      type: 'REMOVE_ITEM', section: 'fixedExpenses', id: added.expenses.fixed[0].id,
    });
    expect(removed.expenses.fixed).toEqual([]);
  });

  it('creates the right item shape per section', () => {
    expect(profileReducer(base(), { type: 'ADD_ITEM', section: 'income' }).income[0])
      .toMatchObject({ source: '', netMonthly: '', stability: 'stable' });
    expect(profileReducer(base(), { type: 'ADD_ITEM', section: 'assets' }).assets[0])
      .toMatchObject({ type: 'savings', balance: '', employerMatchPct: '' });
    expect(profileReducer(base(), { type: 'ADD_ITEM', section: 'goals' }).goals[0])
      .toMatchObject({ type: 'custom', targetAmount: '', targetDate: '' });
  });

  it('toggles insurance coverage', () => {
    const next = profileReducer(base(), { type: 'SET_INSURANCE', kind: 'disability', covered: true });

    expect(next.protection.insurance.disability).toBe(true);
    expect(next.protection.insurance.health).toBe(false);
  });

  it('migrates whatever REPLACE_PROFILE is handed', () => {
    const next = profileReducer(base(), {
      type: 'REPLACE_PROFILE',
      profile: { monthlyIncome: '4000' },
    });

    expect(next.schemaVersion).toBe(2);
    expect(next.summary.monthlyIncome).toBe('4000');
    expect(next.assets).toEqual([]);
  });

  it('ignores unknown actions', () => {
    const profile = base();
    expect(profileReducer(profile, { type: 'NOPE' })).toBe(profile);
  });
});
