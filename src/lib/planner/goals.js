/**
 * Goal feasibility.
 *
 * "Can I afford a $60,000 deposit by June 2029?" is a parameterized question,
 * so it cannot be precomputed into the advisor's context the way the baseline
 * picture is. The advisor calls this instead of estimating.
 */
import { toNumber } from '../derive';

/** Longest horizon we will model, matching the debt planner. */
export const MAX_HORIZON_MONTHS = 600;

/**
 * Whole months from `from` until a 'YYYY-MM' or 'YYYY-MM-DD' target.
 * Returns 0 for a target in the current month or the past.
 */
export const monthsUntil = (targetDate, from = new Date()) => {
  if (!targetDate) return null;
  const match = /^(\d{4})-(\d{2})/.exec(String(targetDate));
  if (!match) return null;

  const targetYear = Number(match[1]);
  const targetMonth = Number(match[2]) - 1;
  if (targetMonth < 0 || targetMonth > 11) return null;

  const months = (targetYear - from.getFullYear()) * 12 + (targetMonth - from.getMonth());
  return Math.max(0, months);
};

/**
 * What a goal requires each month, and whether the surplus covers it.
 * Every field is a plain number so the result can be handed to the model as-is.
 */
export const evaluateGoal = (
  { targetAmount, targetDate, currentAmount = 0, monthlySurplus = 0 },
  today = new Date()
) => {
  const target = toNumber(targetAmount);
  const saved = toNumber(currentAmount);
  const surplus = toNumber(monthlySurplus);
  const remaining = Math.max(0, target - saved);

  const months = monthsUntil(targetDate, today);
  const hasDeadline = months !== null;

  // With no deadline the question becomes "how long at the current surplus?"
  const requiredMonthly = hasDeadline && months > 0 ? remaining / months : null;
  const monthsAtCurrentSurplus =
    surplus > 0 && remaining > 0 ? Math.ceil(remaining / surplus) : remaining === 0 ? 0 : null;

  return {
    targetAmount: target,
    alreadySaved: saved,
    remaining: Math.round(remaining * 100) / 100,
    monthsUntilTarget: months,
    requiredMonthly: requiredMonthly === null ? null : Math.round(requiredMonthly * 100) / 100,
    monthlySurplus: surplus,
    // A deadline already past, or today, cannot be met by saving.
    achievable:
      remaining === 0 ? true : requiredMonthly === null ? surplus > 0 : surplus >= requiredMonthly,
    shortfallPerMonth:
      requiredMonthly === null ? null : Math.round(Math.max(0, requiredMonthly - surplus) * 100) / 100,
    monthsAtCurrentSurplus:
      monthsAtCurrentSurplus === null || monthsAtCurrentSurplus <= MAX_HORIZON_MONTHS
        ? monthsAtCurrentSurplus
        : null,
    beyondHorizon: monthsAtCurrentSurplus !== null && monthsAtCurrentSurplus > MAX_HORIZON_MONTHS,
  };
};
