/**
 * Read a CSV export from a bank or card issuer.
 *
 * Issuers disagree on almost everything: column names, whether purchases are
 * positive or negative, one amount column or separate debit and credit ones.
 * This finds the date, description and amount columns by name, ignores the
 * rest (including any card-number column), and normalises to the statement
 * convention: money out positive, money in negative.
 */
import { parseDate } from './parse';

/** RFC 4180-ish: quoted fields, doubled quotes, commas and newlines inside quotes. */
export const parseCsvRows = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
};

const findColumn = (headers, patterns) => {
  for (const pattern of patterns) {
    const index = headers.findIndex((header) => pattern.test(header));
    if (index !== -1) return index;
  }
  return -1;
};

const toNumber = (raw) => {
  if (raw === undefined || raw === null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const negative = /^\(.*\)$/.test(text) || /^[-−]/.test(text);
  const value = parseFloat(text.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
};

const pad = (n) => String(n).padStart(2, '0');

export class CsvError extends Error {}

export const parseStatementCsv = (text) => {
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new CsvError("That CSV doesn't have any rows to read.");

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const dateCol = findColumn(headers, [/^trans(action)?\.? ?date/, /^date$/, /date/, /^posted/]);
  const descCol = findColumn(headers, [/description/, /merchant/, /payee/, /^name$/, /details/, /memo/]);
  const amountCol = findColumn(headers, [/^amount$/, /amount/]);
  const debitCol = findColumn(headers, [/debit/, /withdrawal/, /money out/, /charge/]);
  const creditCol = findColumn(headers, [/credit$/, /^credit/, /deposit/, /money in/, /payment/]);

  if (dateCol === -1 || descCol === -1 || (amountCol === -1 && debitCol === -1)) {
    throw new CsvError("This CSV doesn't have the date, description and amount columns we look for.");
  }

  const parsed = rows.slice(1).map((cells) => {
    let amount;
    if (amountCol !== -1) {
      amount = toNumber(cells[amountCol]);
    } else {
      const out = toNumber(cells[debitCol]);
      const into = creditCol !== -1 ? toNumber(cells[creditCol]) : null;
      amount = out ? Math.abs(out) : into ? -Math.abs(into) : null;
    }
    return {
      date: parseDate(cells[dateCol] || ''),
      description: (cells[descCol] || '').replace(/\s+/g, ' ').trim(),
      amount,
    };
  });

  const usable = parsed.filter((row) => row.date && row.date.year && row.description && row.amount);

  // One signed amount column: if most non-payment rows are negative, this
  // issuer writes purchases as negative. Flip to money-out-positive.
  if (amountCol !== -1) {
    const purchases = usable.filter((row) => !/payment|thank you|autopay/i.test(row.description));
    const negatives = purchases.filter((row) => row.amount < 0).length;
    if (negatives > purchases.length / 2) usable.forEach((row) => { row.amount = -row.amount; });
  }

  const transactions = usable.map((row) => ({
    date: `${row.date.year}-${pad(row.date.month)}-${pad(row.date.day)}`,
    description: row.description,
    amount: Math.round(row.amount * 100) / 100,
  }));

  const dates = transactions.map((t) => t.date).sort();
  return {
    transactions,
    summary: {
      kind: 'unknown',
      issuer: null,
      periodStart: dates[0] || null,
      periodEnd: dates[dates.length - 1] || null,
      newBalance: null,
      minimumPayment: null,
      dueDate: null,
      apr: null,
    },
  };
};
