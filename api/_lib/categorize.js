/**
 * Sort the transactions the browser could not categorise by itself.
 *
 * What arrives is already minimal: redacted descriptions and amounts, no
 * dates, no names, no account numbers (see src/lib/statement/). The server
 * masks long digit runs and emails again anyway, caps the batch, and accepts
 * only the known category names in the answer.
 */
const CATEGORY_KEYS = [
  'groceries', 'dining', 'delivery', 'coffee', 'transport', 'shopping', 'personal', 'subscriptions',
  'entertainment', 'health', 'travel', 'bills', 'housing', 'insurance', 'education', 'transfers',
  'fees_interest', 'other',
];

const MAX_ITEMS = 150;

const scrub = (text) =>
  String(text || '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '')
    .replace(/\d{6,}/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);

/** Validate the request body into a safe list, or null. */
const cleanItems = (body) => {
  const items = body && Array.isArray(body.items) ? body.items : null;
  if (!items || items.length === 0 || items.length > MAX_ITEMS) return null;
  return items
    .filter((item) => item && Number.isInteger(item.id))
    .map((item) => ({
      id: item.id,
      description: scrub(item.description),
      amount: Number.isFinite(Number(item.amount)) ? Math.round(Number(item.amount) * 100) / 100 : null,
    }));
};

const SYSTEM = [
  'You sort credit card and bank transactions into spending categories.',
  `Categories: ${CATEGORY_KEYS.join(', ')}.`,
  'delivery = food delivery apps; coffee = coffee shops; dining = restaurants and fast food;',
  'subscriptions = recurring memberships, streaming, software and gyms; bills = phone, internet, power, water;',
  'transfers = money sent to people; fees_interest = bank fees and interest. Use other when unsure.',
  'Reply with a JSON object mapping each transaction id (as a string) to one category key. No other text.',
].join(' ');

const promptFor = (items) =>
  `Transactions:\n${items.map((item) => `${item.id}: ${item.description}${item.amount !== null ? ` ($${item.amount})` : ''}`).join('\n')}`;

/** Keep only answers for ids that were asked about, with known categories. */
const readAnswer = (answer, items) => {
  const categories = {};
  items.forEach((item) => {
    const value = answer && (answer[item.id] ?? answer[String(item.id)]);
    categories[item.id] = CATEGORY_KEYS.includes(value) ? value : 'other';
  });
  return categories;
};

module.exports = { CATEGORY_KEYS, MAX_ITEMS, SYSTEM, cleanItems, promptFor, readAnswer, scrub };
