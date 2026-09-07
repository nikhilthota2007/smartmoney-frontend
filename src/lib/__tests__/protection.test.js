import { createEmptyProfile } from '../profile';
import { STATUS, countGaps, getProtectionChecks } from '../protection';

const profileWith = (sections) => {
  const base = createEmptyProfile();
  return { ...base, ...sections, protection: { ...base.protection, ...(sections.protection || {}) } };
};

const find = (checks, key) => checks.find((check) => check.key === key);

describe('getProtectionChecks', () => {
  it('flags missing health cover for everyone', () => {
    expect(find(getProtectionChecks(createEmptyProfile()), 'health').status).toBe(STATUS.GAP);
  });

  it('only asks about disability cover once there is income to protect', () => {
    expect(find(getProtectionChecks(createEmptyProfile()), 'disability')).toBeUndefined();

    const earning = profileWith({ income: [{ id: 1, source: 'Salary', netMonthly: '5000' }] });
    expect(find(getProtectionChecks(earning), 'disability').status).toBe(STATUS.GAP);
  });

  it('only asks about life cover when there are dependents', () => {
    expect(find(getProtectionChecks(createEmptyProfile()), 'life')).toBeUndefined();

    const parent = profileWith({ household: { ...createEmptyProfile().household, dependents: '2' } });
    const check = find(getProtectionChecks(parent), 'life');
    expect(check.status).toBe(STATUS.GAP);
    expect(check.detail).toContain('2 dependents');
  });

  it('marks cover that is in place', () => {
    const covered = profileWith({
      protection: {
        emergencyFundTarget: '',
        insurance: { health: true, life: false, disability: true, renters: true },
      },
    });

    expect(find(getProtectionChecks(covered), 'health').status).toBe(STATUS.OK);
    expect(find(getProtectionChecks(covered), 'renters').status).toBe(STATUS.OK);
  });

  it('says it cannot tell when there is no retirement account on file', () => {
    expect(find(getProtectionChecks(createEmptyProfile()), 'retirement').status).toBe(STATUS.UNKNOWN);
  });

  it('flags a retirement account with no contribution', () => {
    const profile = profileWith({
      assets: [{ id: 1, name: '401k', type: '401k', balance: '20000', monthlyContribution: '' }],
    });

    expect(find(getProtectionChecks(profile), 'retirement').status).toBe(STATUS.GAP);
  });

  it('flags an employer match the user is not receiving', () => {
    const profile = profileWith({
      assets: [{
        id: 1, name: 'Work 401k', type: '401k', balance: '20000',
        monthlyContribution: '', employerMatchPct: '5',
      }],
    });

    const match = find(getProtectionChecks(profile), 'match');
    expect(match.status).toBe(STATUS.GAP);
    expect(match.detail).toContain('5% match');
  });

  it('is satisfied once the match is being captured', () => {
    const profile = profileWith({
      assets: [{
        id: 1, name: 'Work 401k', type: '401k', balance: '20000',
        monthlyContribution: '400', employerMatchPct: '5',
      }],
    });

    expect(find(getProtectionChecks(profile), 'match').status).toBe(STATUS.OK);
    expect(find(getProtectionChecks(profile), 'retirement').status).toBe(STATUS.OK);
  });

  it('compares savings against an emergency fund target when one is set', () => {
    const short = profileWith({
      protection: { emergencyFundTarget: '15000', insurance: createEmptyProfile().protection.insurance },
      assets: [{ id: 1, name: 'Savings', type: 'savings', balance: '9000' }],
    });

    const check = find(getProtectionChecks(short), 'emergency');
    expect(check.status).toBe(STATUS.GAP);
    expect(check.detail).toContain('$6000 short');
  });

  it('skips the emergency target check when none is set', () => {
    expect(find(getProtectionChecks(createEmptyProfile()), 'emergency')).toBeUndefined();
  });
});

describe('countGaps', () => {
  it('counts only the gaps', () => {
    expect(countGaps(getProtectionChecks(createEmptyProfile()))).toBeGreaterThan(0);
  });
});
