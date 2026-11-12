/**
 * Display helpers for the result cards. Presentation only: every figure they
 * receive was calculated in src/lib/.
 */
import { formatCurrency, formatDuration } from '../../lib/format';

/** Whole dollars for headline figures: "$3,460". */
export const money = (amount) => formatCurrency(Math.round(Number(amount) || 0));

const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });

/** The calendar month `months` from `today`: "Dec 2028". */
export const monthLabel = (months, today = new Date()) =>
  monthFormat.format(new Date(today.getFullYear(), today.getMonth() + months, 1));

/** "2 years, 1 month", or "Under a month" for zero. */
export const duration = (months) =>
  months <= 0 ? 'Under a month' : formatDuration(Math.floor(months / 12), months % 12);

/** Theme tone for a health-score rating name (the library's own colours are hex). */
export const RATING_TONE = {
  Excellent: 'success',
  Good: 'success',
  Fair: 'warning',
  'Needs Improvement': 'danger',
};

/** Short form for tight spaces: "25 mo" or "6 yrs". */
export const shortDuration = (months) => {
  if (months < 24) return `${months} mo`;
  const years = months / 12;
  return `${Number.isInteger(years) ? years : years.toFixed(1)} yrs`;
};
