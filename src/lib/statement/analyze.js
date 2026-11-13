/**
 * What a statement says about someone's spending, and what to change.
 *
 * Pure arithmetic over categorised transactions. The AI never computes any
 * of this: it only sorts merchants it could not be told about in advance.
 *
 * Each fix states its own assumption ("cook or pick up half of them"), so
 * the saving it quotes is an estimate the user can judge, not a promise.
 * A fix quotes the same figure as the category bar it refers to.
 */
import { CATEGORIES } from './categories';

const DAY_MS = 24 * 60 * 60 * 1000;
const AVERAGE_MONTH_DAYS = 30.44;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const round2 = (n) => Math.round(n * 100) / 100;
/** Savings are estimates, so they are shown rounded to $5. */
const roundEstimate = (n) => Math.round(n / 5) * 5;
const dollars = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const cents = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const daysBetween = (start, end) => Math.round((new Date(end) - new Date(start)) / DAY_MS) + 1;

/** "2026-10-05" → "Oct 5", without depending on the browser's locale or zone. */
export const shortDay = (iso) => {
  const [, month, day] = String(iso).split('-').map(Number);
  return month ? `${MONTH_NAMES[month - 1]} ${day}` : String(iso);
};

/**
 * How to scale the statement to a month. A 26-35 day statement is a month;
 * anything else is scaled, within reason.
 */
export const monthlyFactor = (periodStart, periodEnd) => {
  if (!periodStart || !periodEnd) return 1;
  const days = daysBetween(periodStart, periodEnd);
  if (!Number.isFinite(days) || days <= 0) return 1;
  if (days >= 26 && days <= 35) return 1;
  return Math.min(4, Math.max(0.25, AVERAGE_MONTH_DAYS / days));
};

const KNOWN_MERCHANTS = [
  [/uber\s*\*?\s*eats/i, 'Uber Eats'], [/doordash/i, 'DoorDash'], [/grubhub/i, 'Grubhub'],
  [/netflix/i, 'Netflix'], [/spotify/i, 'Spotify'], [/hulu/i, 'Hulu'], [/apple\.com\/bill|itunes/i, 'Apple'],
  [/planet fitness/i, 'Planet Fitness'], [/disney/i, 'Disney+'], [/youtube/i, 'YouTube'], [/audible/i, 'Audible'],
  [/kindle/i, 'Kindle Unlimited'], [/chegg/i, 'Chegg'], [/amazon prime|prime video/i, 'Amazon Prime'],
  [/starbucks/i, 'Starbucks'], [/amazon|amzn/i, 'Amazon'], [/peloton/i, 'Peloton'], [/hbo|max\.com/i, 'Max'],
  [/microsoft/i, 'Microsoft'], [/adobe/i, 'Adobe'], [/google/i, 'Google'], [/paramount/i, 'Paramount+'],
  [/peacock/i, 'Peacock'], [/crunchyroll/i, 'Crunchyroll'], [/duolingo/i, 'Duolingo'], [/siriusxm/i, 'SiriusXM'],
];

/** "UBER *EATS PENDING SAN FRANCISCO CA" → "Uber Eats" style display names. */
export const merchantName = (description) => {
  const hit = KNOWN_MERCHANTS.find(([pattern]) => pattern.test(description));
  if (hit) return hit[1];
  const words = description.replace(/[#*].*$/, '').split(/\s+/).filter((w) => /[a-z]/i.test(w)).slice(0, 3);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || description;
};

const sum = (items) => items.reduce((total, item) => total + item.amount, 0);

/**
 * Services that bill on a schedule, recognised by name or wording, whatever
 * category they were sorted into (a study service can look like education).
 */
const SUBSCRIPTION_HINT = /\b(subscription|subscr|membership|monthly plan|recurring|chegg|kindle unlimited|kindle unltd|amazon prime|prime video|audible|scribd|patreon|crunchyroll|discord|nitro|game pass|playstation plus|ps plus|nintendo online|grammarly|notion|canva|linkedin premium|tinder|bumble|hinge|match\.com|noom|ww international|weight watchers|hellofresh|blue apron|factor75|dollar shave|ipsy|fabletics|masterclass|skillshare|brilliant|quizlet|course hero|icloud|google one|google storage|youtube premium|microsoft 365|adobe|dropbox|siriusxm|nytimes|wsj|substack|duolingo|headspace|calm\.com)\b/i;

/** Categories where the same amount twice is routine, not a subscription. */
const NOT_RECURRING = ['coffee', 'groceries', 'dining', 'delivery', 'transport', 'fees_interest', 'transfers', 'payment'];

/**
 * Which charges are subscriptions: sorted as one, named like one, or the same
 * merchant charging the same amount on different dates.
 */
export const findSubscriptionIds = (spending) => {
  const ids = new Set();
  const repeats = {};
  spending.forEach((t) => {
    if (t.category === 'subscriptions' || SUBSCRIPTION_HINT.test(t.description)) ids.add(t.id);
    if (NOT_RECURRING.includes(t.category) || t.amount < 3 || t.amount > 150) return;
    const key = `${merchantName(t.description)}|${t.amount.toFixed(2)}`;
    (repeats[key] = repeats[key] || []).push(t);
  });
  Object.values(repeats).forEach((list) => {
    if (new Set(list.map((t) => t.date)).size >= 2) list.forEach((t) => ids.add(t.id));
  });
  return ids;
};

/**
 * The same merchant, amount and day more than once. Often a double charge;
 * sometimes two real purchases, which is why the fix says "possible".
 */
export const findDuplicates = (spending) => {
  const groups = {};
  spending
    .filter((t) => !['payment', 'fees_interest', 'transfers'].includes(t.category) && t.amount >= 5)
    .forEach((t) => {
      const merchant = merchantName(t.description);
      const key = `${merchant}|${t.date}|${t.amount.toFixed(2)}`;
      if (!groups[key]) groups[key] = { merchant, date: t.date, amount: t.amount, count: 0 };
      groups[key].count += 1;
    });
  return Object.values(groups)
    .filter((group) => group.count >= 2)
    .map((group) => ({ ...group, extra: round2(group.amount * (group.count - 1)) }))
    .sort((a, b) => b.extra - a.extra);
};

/**
 * The fixes. Duplicates and late fees are exact and come first; the rest are
 * estimates worth at least $10 a month, biggest first, at most four.
 */
const buildFixes = ({ byKey, spending, subscriptions, duplicates, factor }) => {
  const total = (key) => (byKey[key] ? byKey[key].total : 0);
  const monthly = (key) => (byKey[key] ? byKey[key].monthly : 0);
  const count = (key) => (byKey[key] ? byKey[key].count : 0);

  const refunds = duplicates.slice(0, 3).map((duplicate) => ({
    id: `duplicate-${duplicate.date}-${duplicate.amount}`,
    kind: 'refund',
    title: 'Possible duplicate charge',
    detail: `${cents(duplicate.amount)} from ${duplicate.merchant} on ${shortDay(duplicate.date)}, ${duplicate.count === 2 ? 'twice' : `${duplicate.count} times`}. If you only bought it once, ask for a refund.`,
    refund: duplicate.extra,
    saving: 0,
    exact: true,
  }));

  const exact = [];
  const lateFees = spending.filter((t) => t.category === 'fees_interest' && /late fee|returned payment/i.test(t.description));
  if (lateFees.length) {
    exact.push({
      id: 'late-fee',
      title: 'Turn on autopay for the minimum',
      detail: `A ${dollars(sum(lateFees))} late fee showed up. Autopay for at least the minimum makes that one disappear for good.`,
      saving: round2(sum(lateFees) * factor),
      exact: true,
    });
  }

  const estimates = [];
  if (total('delivery') > 0) {
    estimates.push({
      id: 'delivery',
      title: 'Halve the delivery orders',
      detail: `${count('delivery')} delivery orders came to ${dollars(total('delivery'))}. Cooking or picking up half of them keeps about this much.`,
      saving: roundEstimate(monthly('delivery') * 0.5),
    });
  }

  if (subscriptions.length > 0) {
    const names = subscriptions.map((subscription) => subscription.name);
    estimates.push({
      id: 'subscriptions',
      title: 'Cancel the subscriptions you barely use',
      detail: `${names.length} subscription${names.length === 1 ? '' : 's'} (${names.slice(0, 4).join(', ')}${names.length > 4 ? '…' : ''}) came to ${dollars(total('subscriptions'))}. Dropping the ones you forgot about usually frees around 40% of that.`,
      saving: roundEstimate(monthly('subscriptions') * 0.4),
    });
  }

  if (total('shopping') > 0) {
    estimates.push({
      id: 'shopping',
      title: 'Wait 48 hours on non-essential buys',
      detail: `Shopping came to ${dollars(total('shopping'))}. A two-day pause before checkout typically cuts about a quarter of it.`,
      saving: roundEstimate(monthly('shopping') * 0.25),
    });
  }

  if (total('dining') > 0) {
    estimates.push({
      id: 'dining',
      title: 'Eat out a little less',
      detail: `Eating out came to ${dollars(total('dining'))}. Swapping one in three meals out for one at home keeps about this much.`,
      saving: roundEstimate(monthly('dining') * 0.33),
    });
  }

  if (total('coffee') > 0) {
    estimates.push({
      id: 'coffee',
      title: 'Make coffee at home half the time',
      detail: `${count('coffee')} coffee runs came to ${dollars(total('coffee'))}. Brewing every other one at home keeps half of that.`,
      saving: roundEstimate(monthly('coffee') * 0.5),
    });
  }

  if (total('entertainment') > 0) {
    estimates.push({
      id: 'entertainment',
      title: 'Pick your favourite nights out',
      detail: `Fun came to ${dollars(total('entertainment'))}. Trimming a quarter of it still leaves the good stuff.`,
      saving: roundEstimate(monthly('entertainment') * 0.25),
    });
  }

  const monthlyFixes = [...exact, ...estimates.filter((fix) => fix.saving >= 10).sort((a, b) => b.saving - a.saving)].slice(0, 4);
  return [...refunds, ...monthlyFixes];
};

/**
 * Totals by category, scaled to a month, plus subscriptions, possible
 * duplicate charges and the fixes.
 *
 * `transactions` carry { id, date, description, amount, category }. Payments
 * and credits (negative amounts) are not spending and are left out.
 */
export const analyzeSpending = ({ transactions, summary = {} }, { monthlyIncome = 0 } = {}) => {
  const charges = transactions.filter((t) => t.amount > 0 && t.category !== 'payment');
  const subscriptionIds = findSubscriptionIds(charges);
  // One definition everywhere: a detected subscription counts as one in the
  // bars, the fix and the profile, whatever it was sorted into first.
  const spending = charges.map((t) => (subscriptionIds.has(t.id) ? { ...t, category: 'subscriptions' } : t));

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

  const subscriptionsByName = {};
  spending
    .filter((t) => t.category === 'subscriptions')
    .forEach((t) => {
      const name = merchantName(t.description);
      if (!subscriptionsByName[name]) subscriptionsByName[name] = { name, amount: 0, count: 0 };
      subscriptionsByName[name].amount = round2(subscriptionsByName[name].amount + t.amount);
      subscriptionsByName[name].count += 1;
    });
  const subscriptions = Object.values(subscriptionsByName).sort((a, b) => b.amount - a.amount);

  const duplicates = findDuplicates(spending);
  const fixes = buildFixes({ byKey, spending, subscriptions, duplicates, factor });
  const feesAndInterest = spending
    .filter((t) => t.category === 'fees_interest')
    .map((t) => ({ name: merchantName(t.description), amount: t.amount }));

  return {
    periodStart,
    periodEnd,
    days: periodStart && periodEnd ? daysBetween(periodStart, periodEnd) : null,
    transactionCount: transactions.length,
    total,
    monthly: round2(total * factor),
    categories,
    subscriptions,
    duplicates,
    feesAndInterest,
    interestAndFees: byKey.fees_interest ? byKey.fees_interest.monthly : 0,
    incomeShare: monthlyIncome > 0 ? (total * factor) / monthlyIncome : null,
    fixes,
    monthlySaving: round2(fixes.reduce((saved, fix) => saved + (fix.saving || 0), 0)),
    possibleRefunds: round2(duplicates.reduce((refund, duplicate) => refund + duplicate.extra, 0)),
  };
};
