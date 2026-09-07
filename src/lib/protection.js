/**
 * Coverage and retirement checks.
 *
 * These deliberately sit outside the 0-100 health score. The score measures
 * three things every household has (savings rate, debt load, emergency runway),
 * and keeping its components fixed is what makes the number comparable as the
 * user fills in more of their profile. These checks add the detail instead of
 * moving the goalposts.
 */
import { toNumber } from './derive';
import { RETIREMENT_ASSET_TYPES, deriveSummary } from './profile';

export const STATUS = { OK: 'ok', GAP: 'gap', UNKNOWN: 'unknown' };

const check = (key, label, status, detail) => ({ key, label, status, detail });

export const getProtectionChecks = (profile) => {
  const { insurance, emergencyFundTarget } = profile.protection;
  const summary = deriveSummary(profile);
  const dependents = toNumber(profile.household.dependents);
  const checks = [];

  checks.push(
    insurance.health
      ? check('health', 'Health insurance', STATUS.OK, 'Covered')
      : check('health', 'Health insurance', STATUS.GAP,
          'An uninsured medical event is the most common cause of sudden debt')
  );

  if (toNumber(summary.monthlyIncome) > 0) {
    checks.push(
      insurance.disability
        ? check('disability', 'Disability insurance', STATUS.OK, 'Covered')
        : check('disability', 'Disability insurance', STATUS.GAP,
            'Your income is your largest asset, and this is what protects it')
    );
  }

  if (dependents > 0) {
    checks.push(
      insurance.life
        ? check('life', 'Life insurance', STATUS.OK, 'Covered')
        : check('life', 'Life insurance', STATUS.GAP,
            `You listed ${dependents} dependent${dependents > 1 ? 's' : ''} and no life cover`)
    );
  }

  checks.push(
    insurance.renters
      ? check('renters', 'Renters or home insurance', STATUS.OK, 'Covered')
      : check('renters', 'Renters or home insurance', STATUS.GAP, 'Not recorded')
  );

  const retirementAccounts = profile.assets.filter((a) => RETIREMENT_ASSET_TYPES.includes(a.type));
  if (retirementAccounts.length === 0) {
    checks.push(check('retirement', 'Retirement saving', STATUS.UNKNOWN,
      'No 401(k) or IRA recorded — add one to see whether you are on track'));
  } else {
    const contributing = retirementAccounts.filter((a) => toNumber(a.monthlyContribution) > 0);
    checks.push(
      contributing.length > 0
        ? check('retirement', 'Retirement saving', STATUS.OK,
            `Contributing $${contributing.reduce((t, a) => t + toNumber(a.monthlyContribution), 0)}/mo`)
        : check('retirement', 'Retirement saving', STATUS.GAP,
            'You have a retirement account but no monthly contribution recorded')
    );

    // An employer match is the only guaranteed return in personal finance;
    // not capturing it is money declined.
    const matched = retirementAccounts.filter((a) => toNumber(a.employerMatchPct) > 0);
    if (matched.length > 0) {
      const uncaptured = matched.filter((a) => toNumber(a.monthlyContribution) === 0);
      checks.push(
        uncaptured.length === 0
          ? check('match', 'Employer match', STATUS.OK, 'You are contributing enough to receive a match')
          : check('match', 'Employer match', STATUS.GAP,
              `${uncaptured[0].name || 'Your account'} offers a ${uncaptured[0].employerMatchPct}% match you are not receiving`)
      );
    }
  }

  const target = toNumber(emergencyFundTarget);
  if (target > 0) {
    const saved = toNumber(summary.savings);
    checks.push(
      saved >= target
        ? check('emergency', 'Emergency fund target', STATUS.OK, `$${saved} saved of a $${target} target`)
        : check('emergency', 'Emergency fund target', STATUS.GAP,
            `$${Math.round(target - saved)} short of your $${target} target`)
    );
  }

  return checks;
};

export const countGaps = (checks) => checks.filter((c) => c.status === STATUS.GAP).length;
