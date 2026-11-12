/**
 * Find the transactions and the summary figures in a statement's text.
 *
 * Statements vary, but a transaction line almost always has the same shape:
 * a date (sometimes two: transaction and posting), a description, and an
 * amount at the end. Only lines with that shape are kept. Everything else on
 * the statement (the cardholder's name and address, the account number,
 * the marketing and legal text) is dropped here and never goes anywhere.
 *
 * Amounts follow one convention from here on: money out is positive, money
 * in (payments, refunds, deposits) is negative.
 */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const NUMERIC_DATE = String.raw`\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?`;
const NAMED_DATE = String.raw`(?:jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:,?\s+\d{4})?`;
const DATE = `(?:${NUMERIC_DATE}|${NAMED_DATE})`;
const AMOUNT = String.raw`[-−–+]?\s?\$?\s?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}(?:\s?(?:CR|DR)\b|-)?`;

const TRANSACTION_LINE = new RegExp(
  String.raw`^\s*(${DATE})\s+(?:(${DATE})\s+)?(.+?)\s+(${AMOUNT})(?:\s+(${AMOUNT}))?\s*$`,
  'i'
);

/** "$1,234.56", "-$12.00", "45.10 CR" → a signed number (credits negative). */
export const parseAmount = (raw) => {
  if (!raw) return null;
  const text = String(raw).trim();
  const credit = /^[-−–]/.test(text) || /CR$/i.test(text) || /\d-$/.test(text);
  const value = parseFloat(text.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(value)) return null;
  return credit ? -value : value;
};

const twoDigitYear = (year) => (year < 100 ? 2000 + year : year);

/** Parse a date written on a statement into { year?, month, day }. */
export const parseDate = (raw) => {
  const text = String(raw).trim().toLowerCase();
  const numeric = /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/.exec(text);
  if (numeric) {
    const month = Number(numeric[1]);
    const day = Number(numeric[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { month, day, year: numeric[3] ? twoDigitYear(Number(numeric[3])) : null };
  }
  const named = /^([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?$/.exec(text);
  if (named) {
    const month = MONTHS.indexOf(named[1]) + 1;
    if (month === 0) return null;
    return { month, day: Number(named[2]), year: named[3] ? Number(named[3]) : null };
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
  return null;
};

const pad = (n) => String(n).padStart(2, '0');
const isoDate = ({ year, month, day }) => `${year}-${pad(month)}-${pad(day)}`;

const findMoney = (lines, pattern) => {
  for (const line of lines) {
    const match = pattern.exec(line);
    if (match) return parseAmount(match[1]);
  }
  return null;
};

const findText = (lines, pattern) => {
  for (const line of lines) {
    const match = pattern.exec(line);
    if (match) return match[1];
  }
  return null;
};

const MONEY = String.raw`(-?\$?\s?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})`;
const FULL_DATE = String.raw`(\d{1,2}/\d{1,2}/\d{2,4})`;

/** Lender names worth showing ("Northwind Bank card"); never personal. */
const ISSUER_HINT = /\b(bank|card|credit|visa|mastercard|amex|american express|discover|capital one|chase|citi|wells fargo|synchrony|barclays|union|financial)\b/i;

/**
 * The figures a card statement prints in its summary box. Each is optional:
 * a bank statement has none of the card ones, and wording varies.
 */
export const parseSummary = (lines) => {
  const period = (() => {
    for (const line of lines) {
      const match = new RegExp(`${FULL_DATE}\\s*(?:-|–|to|through|thru)\\s*${FULL_DATE}`, 'i').exec(line);
      if (match) return { start: parseDate(match[1]), end: parseDate(match[2]) };
    }
    const closing = findText(lines, new RegExp(`(?:closing date|statement date)[^0-9]*${FULL_DATE}`, 'i'));
    return closing ? { start: null, end: parseDate(closing) } : null;
  })();

  const apr = (() => {
    const purchases = findText(lines, /purchases?\b[^%]*?(\d{1,2}(?:\.\d{1,2})?)\s?%/i);
    const any = purchases || findText(lines, /(?:apr|annual percentage rate)[^%]*?(\d{1,2}(?:\.\d{1,2})?)\s?%/i);
    return any ? Number(any) : null;
  })();

  const firstLine = (lines.find((line) => line.trim()) || '').trim();

  return {
    kind: lines.some((line) => /minimum payment/i.test(line)) ? 'card' : 'bank',
    issuer: ISSUER_HINT.test(firstLine) && firstLine.length < 60 ? firstLine : null,
    periodStart: period && period.start && period.start.year ? isoDate(period.start) : null,
    periodEnd: period && period.end && period.end.year ? isoDate(period.end) : null,
    newBalance: findMoney(lines, new RegExp(`(?:new balance|statement balance|closing balance)[:\\s]*${MONEY}`, 'i')),
    minimumPayment: findMoney(lines, new RegExp(`minimum (?:payment|amount)(?: due)?[:\\s]*${MONEY}`, 'i')),
    dueDate: (() => {
      const raw = findText(lines, new RegExp(`payment due date[:\\s]*${FULL_DATE}`, 'i'));
      const parsed = raw && parseDate(raw);
      return parsed && parsed.year ? isoDate(parsed) : null;
    })(),
    apr,
  };
};

const HEADER_WORDS = /^(trans(?:action)?\.?\s*date|post(?:ing|ed)?\s*date|date|description|amount|details|balance)\b/i;

/** Bank-statement words that mean money came in, when there is no sign. */
const MONEY_IN = /\b(deposit|direct dep|payroll|salary|refund|credit|interest paid|transfer from|payment received|zelle from|venmo from|cashout)\b/i;

/**
 * Pick the transaction lines out of a statement's text.
 * Returns { transactions, summary }.
 */
export const parseStatementText = (lines) => {
  const summary = parseSummary(lines);
  const end = summary.periodEnd ? parseDate(summary.periodEnd) : null;
  const fallbackYear = end ? end.year : new Date().getFullYear();

  const transactions = [];
  lines.slice(0, 4000).forEach((line) => {
    const match = TRANSACTION_LINE.exec(line);
    if (!match) return;
    const [, first, , rawDescription, firstAmount, secondAmount] = match;
    const description = rawDescription.replace(/\s{2,}/g, ' ').trim();
    if (!description || HEADER_WORDS.test(description) || /^[\d\s.,$%-]+$/.test(description)) return;

    const date = parseDate(first);
    if (!date) return;
    if (!date.year) {
      // A January statement can list December purchases.
      date.year = end && date.month > end.month ? fallbackYear - 1 : fallbackYear;
    }

    let amount = parseAmount(firstAmount);
    if (amount === null || amount === 0) return;
    // Two trailing amounts on a bank statement: the amount, then the running
    // balance. Neither carries a sign, so the description decides.
    if (secondAmount && summary.kind === 'bank' && amount > 0 && MONEY_IN.test(description)) {
      amount = -amount;
    }

    transactions.push({ date: isoDate(date), description, amount: Math.round(amount * 100) / 100 });
  });

  return { transactions, summary };
};
