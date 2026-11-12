/**
 * What a statement says about someone's spending, and what to change.
 *
 * Pure arithmetic over categorised transactions. The AI never computes any
 * of this: it only sorts merchants it could not be told about in advance.
 *
 * Each fix states its own assumption ("cook or pick up half of them"), so
 * the saving it quotes is an estimate the user can judge, not a promise.
 */
import { CATEGORIES } from './categories';

const DAY_MS = 24 * 60 * 60 * 1000;
const AVERAGE_MONTH_DAYS = 30.44;

const round2 = (n) => Math.round(n * 100) / 100;
/** Savings are estimates, so they are shown rounded to $5. */
const roundEstimate = (n) => Math.round(n / 5) * 5;

const daysBetween = (start, end) => Math.round((new Date(end) - new Date(start)) / DAY_MS) + 1;

/**
 * How to scale the statement to a month. A 28-35 day statement is a month;
 * anything else is scaled, within reason.
 */
export const monthlyFactor = (periodStart, periodEnd) => {
  if (!periodStart || !periodEnd) return 1;
  const days = daysBetween(periodStart, periodEnd);
  if (!Number.isFinite(days) || days <= 0) return 1;
  if (days >= 26 && days <= 35) return 1;
  return Math.min(4, Math.max(0.25, AVERAGE_MONTH_DAYS / days));
};

/** "UBER *EATS PENDING SAN FRANCISCO CA" → "Uber Eats" style display names. */
export const merchantName = (description) => {
  const known = [
    [/uber\s*\*?\s*eats/i, 'Uber Eats'], [/doordash/i, 'DoorDash'], [/grubhub/i, 'Grubhub'],
    [/netflix/i, 'Netflix'], [/spotify/i, 'Spotify'], [/hulu/i, 'Hulu'], [/apple\.com\/bill|itunes/i, 'Apple'],
    [/planet fitness/i, 'Planet Fitness'], [/disney/i, 'Disney+'], [/youtube/i, 'YouTube'], [/audible/i, 'Audible'],
    [/starbucks/i, 'Starbucks'], [/amazon|amzn/i, 'Amazon'], [/peloton/i, 'Peloton'], [/hbo|max\.com/i, 'Max'],
  ];
  const hit = known.find(([pattern]) => pattern.test(description));
  if (hit) return hit[1];
  const words = description.replace(/[#*].*$/, '').split(/\s+/).filter((w) => /[a-z]/i.test(w)).slice(0, 3);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || description;
};

const sum = (items) => items.reduce((total, item) => total + item.amount, 0);

/**
 * The fixes, each with an assumption and a monthly saving. Only fixes worth
 * at least $10 a month are kept; the late-fee one is exact, not estimated.
 */
const buildFixes = ({ byKey, monthly, transactions, factor }) => {
  const fixes = [];
  const count = (key) => (byKey[key] ? byKey[key].count : 0);
  const spent = (key) => (byKey[key] ? byKey[key].monthly : 0);

  const lateFees = transactions.filter((t) => t.category === 'fees_interest' && /late fee|returned payment/i.test(t.description));
  if (lateFees.length) {
    const amount = round2(sum(lateFees) * factor);
    fixes.push({
      id: 'late-fee',
      title: 'Turn on autopay for the minimum',
      detail: `A ${'$'}${Math.round(sum(lateFees))} late fee showed up. Autopay for at least the minimum makes that one disappear for good.`,
      saving: amount,
      exact: true,
    });
  }

  if (spent('delivery') > 0) {
    fixes.push({
      id: 'delivery',
      title: 'Halve the delivery orders',
      detail: `${count('delivery')} delivery orders came to ${'$'}${Math.round(spent('delivery'))}. Cooking or picking up half of them keeps about this much.`,
      saving: roundEstimate(spent('delivery') * 0.5),
    });
  }

  if (spent('subscriptions') > 0) {
    const names = [...new Set(transactions.filter((t) => t.category === 'subscriptions').map((t) => merchantName(t.description)))];
    fixes.push({
      id: 'subscriptions',
      title: 'Cancel the subscriptions you barely use',
      detail: `${names.length} subscriptions (${names.slice(0, 4).join(', ')}${names.length > 4 ? '…' : ''}) cost ${'$'}${Math.round(spent('subscriptions'))} a month. Dropping the ones you forgot about usually frees around 40% of that.`,
      saving: roundEstimate(spent('subscriptions') * 0.4),
    });
  }

  const shopping = spent('shopping') + spent('personal');
  if (shopping > 0) {
    fixes.push({
      id: 'shopping',
      title: 'Wait 48 hours on non-essential buys',
      detail: `Shopping came to ${'$'}${Math.round(shopping)}. A two-day pause before checkout typically cuts about a quarter of it.`,
      saving: roundEstimate(shopping * 0.25),
    });
  }

  if (spent('dining') > 0) {
    fixes.push({
      id: 'dining',
      title: 'Eat out a little less',
      detail: `Eating out came to ${'$'}${Math.round(spent('dining'))}. Swapping one in three meals out for one at home keeps about this much.`,
      saving: roundEstimate(spent('dining') * 0.33),
    });
  }

  if (spent('coffee') > 0) {
    fixes.push({
      id: 'coffee',
      title: 'Make coffee at home half the time',
      detail: `${count('coffee')} coffee runs came to ${'$'}${Math.round(spent('coffee'))}. Brewing every other one at home keeps half of that.`,
      saving: roundEstimate(spent('coffee') * 0.5),
    });
  }

  if (spent('entertainment') > 0) {
    fixes.push({
      id: 'entertainment',
      title: 'Pick your favourite nights out',
      detail: `Fun came to ${'$'}${Math.round(spent('entertainment'))}. Trimming a quarter of it still leaves the good stuff.`,
      saving: roundEstimate(spent('entertainment') * 0.25),
    });
  }

  return fixes
    .filter((fix) => fix.saving >= 10)
    .sort((a, b) => (b.exact ? 1 : 0) - (a.exact ? 1 : 0) || b.saving - a.saving)
    .slice(0, 4);
};

/**
 * Totals by category, scaled to a month, plus the fixes.
 *
 * `transactions` carry { date, description, amount, category }. Payments and
 * credits (negative amounts) are not spending and are left out.
 */
export const analyzeSpending = ({ transactions, summary = {} }, { monthlyIncome = 0 } = {}) => {
  const spending = transactions.filter((t) => t.amount > 0 && t.category !== 'payment');
  const dates = transactions.map((t) => t.date).sort();
  const periodStart = summary.periodStart || dates[0] || null;
  const periodEnd = summary.periodEnd || dates[dates.length - 1] || null;
  const factor = monthlyFactor(periodStart, periodEnd);

  const byKey = {};
  spending.forEach((t) => {
    const key = CATEGORIES[t.category] ? t.category : 'other';
    if (!byKey[key]) byKey[key] = { category: key, label: CATEGORIES[key].label, total: 0, count: 0 };
    byKey[key].total += t.amount;
    byKey[key].count += 1;
  });

  const total = round2(sum(spending));
  const categories = Object.values(byKey)
    .map((entry) => ({
      ...entry,
      total: round2(entry.total),
      monthly: round2(entry.total * factor),
      share: total > 0 ? entry.total / total : 0,
    }))
    .sort((a, b) => b.total - a.total);
  categories.forEach((entry) => { byKey[entry.category] = entry; });

  const monthly = round2(total * factor);
  const fixes = buildFixes({ byKey, monthly, transactions: spending, factor });
  const interestAndFees = byKey.fees_interest ? byKey.fees_interest.monthly : 0;

  return {
    periodStart,
    periodEnd,
    days: periodStart && periodEnd ? daysBetween(periodStart, periodEnd) : null,
    transactionCount: transactions.length,
    total,
    monthly,
    categories,
    interestAndFees,
    incomeShare: monthlyIncome > 0 ? monthly / monthlyIncome : null,
    fixes,
    monthlySaving: round2(fixes.reduce((total, fix) => total + fix.saving, 0)),
  };
};
