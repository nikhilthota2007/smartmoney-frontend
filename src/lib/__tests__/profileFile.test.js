import { createEmptyProfile } from '../profile';
import { parseProfileFile, serializeProfile } from '../profileFile';

describe('profile export and import', () => {
  it('round-trips a profile unchanged', () => {
    const profile = createEmptyProfile();
    profile.summary.monthlyIncome = '5000';
    profile.income = [{ id: 1, source: 'Salary', netMonthly: '5000', stability: 'stable' }];
    profile.goals = [{ id: 1, name: 'House', type: 'purchase', targetAmount: '60000', targetDate: '2029-06', priority: 'high' }];

    expect(parseProfileFile(serializeProfile(profile))).toEqual(profile);
  });

  it('accepts an older v1 export and migrates it', () => {
    const imported = parseProfileFile(JSON.stringify({ monthlyIncome: '3000', goals: 'Save' }));

    expect(imported.schemaVersion).toBe(2);
    expect(imported.summary.monthlyIncome).toBe('3000');
  });

  it('backfills sections missing from a partial export', () => {
    const imported = parseProfileFile(JSON.stringify({ schemaVersion: 2, summary: { savings: '100' } }));

    expect(imported.summary.savings).toBe('100');
    expect(imported.assets).toEqual([]);
    expect(imported.protection.insurance.health).toBe(false);
  });

  it('rejects a file that is not JSON, with a message worth showing', () => {
    expect(() => parseProfileFile('not json at all')).toThrow(/valid JSON/);
  });

  it('rejects JSON that is not a profile object', () => {
    expect(() => parseProfileFile('[1,2,3]')).toThrow(/SmartMoney profile/);
    expect(() => parseProfileFile('"a string"')).toThrow(/SmartMoney profile/);
    expect(() => parseProfileFile('null')).toThrow(/SmartMoney profile/);
  });

  it('writes readable JSON', () => {
    expect(serializeProfile(createEmptyProfile())).toContain('\n  "schemaVersion": 2');
  });
});
