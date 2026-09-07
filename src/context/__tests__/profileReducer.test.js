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

  it('adds a debt with the next free id', () => {
    const profile = { ...base(), debts: [{ id: 1 }, { id: 4 }] };
    const next = profileReducer(profile, { type: 'ADD_DEBT' });

    expect(next.debts).toHaveLength(3);
    expect(next.debts[2].id).toBe(5);
    expect(next.debts[2].name).toBe('');
  });

  it('removes a debt by id', () => {
    const profile = { ...base(), debts: [{ id: 1 }, { id: 2 }] };
    const next = profileReducer(profile, { type: 'REMOVE_DEBT', id: 1 });

    expect(next.debts).toEqual([{ id: 2 }]);
  });

  it('refuses to remove the last remaining debt row', () => {
    const profile = base();
    const next = profileReducer(profile, { type: 'REMOVE_DEBT', id: profile.debts[0].id });

    expect(next).toBe(profile);
    expect(next.debts).toHaveLength(1);
  });

  it('updates one field of one debt', () => {
    const profile = { ...base(), debts: [{ id: 1, balance: '' }, { id: 2, balance: '' }] };
    const next = profileReducer(profile, { type: 'UPDATE_DEBT', id: 2, field: 'balance', value: '900' });

    expect(next.debts[0].balance).toBe('');
    expect(next.debts[1].balance).toBe('900');
  });

  it('ignores unknown actions', () => {
    const profile = base();
    expect(profileReducer(profile, { type: 'NOPE' })).toBe(profile);
  });
});
