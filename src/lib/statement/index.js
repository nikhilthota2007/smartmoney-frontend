/**
 * Statement reading, start to finish, on the device.
 *
 *   file → text (pdf.js, or the CSV itself)
 *        → transaction lines only (parse.js drops name, address, account no.)
 *        → each description redacted (redact.js)
 *        → categorised on the device where the merchant is known
 *
 * What is left for an AI to sort is `unknown`: redacted descriptions and
 * amounts, with no dates and nothing else. The UI shows exactly that list
 * before anything is sent.
 */
import { parseStatementText } from './parse';
import { parseStatementCsv } from './csv';
import { findHolderNames, redactDescription } from './redact';
import { categorizeLocally, CATEGORY_KEYS } from './categories';
import { readFileAsText } from '../profileFile';

export { analyzeSpending, merchantName } from './analyze';
export { CATEGORIES, CATEGORY_KEYS } from './categories';
export { StatementReadError } from './pdf';

/** Statements are small; anything bigger is almost certainly something else. */
export const MAX_FILE_BYTES = 15 * 1024 * 1024;

export const prepareStatement = ({ lines, csvText }) => {
  const parsed = lines ? parseStatementText(lines) : parseStatementCsv(csvText);
  const names = lines ? findHolderNames(lines) : [];

  const transactions = parsed.transactions.map((transaction, index) => {
    const description = redactDescription(transaction.description, { names }) || 'Unnamed';
    return {
      id: index + 1,
      date: transaction.date,
      description,
      amount: transaction.amount,
      category: categorizeLocally({ description, amount: transaction.amount }),
    };
  });

  return {
    summary: parsed.summary,
    transactions,
    unknown: transactions
      .filter((transaction) => !transaction.category)
      .map(({ id, description, amount }) => ({ id, description, amount })),
  };
};

/** Fill in categories returned by the AI; anything missing or invalid is "other". */
export const applyCategories = (transactions, categories = {}) =>
  transactions.map((transaction) => {
    if (transaction.category) return transaction;
    const suggested = categories[transaction.id];
    return {
      ...transaction,
      category: CATEGORY_KEYS.includes(suggested) && suggested !== 'payment' ? suggested : 'other',
    };
  });

export class UnsupportedFileError extends Error {}

const isPdf = (file) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
const isCsv = (file) => /csv|text\/plain|excel/.test(file.type || '') || /\.(csv|txt)$/i.test(file.name || '');

/** Read a file the user picked. Everything happens in the browser. */
export const readStatementFile = async (file) => {
  if (!file) throw new UnsupportedFileError('No file was chosen.');
  if (file.size > MAX_FILE_BYTES) {
    throw new UnsupportedFileError("That file is too big to be a statement. Try the monthly PDF or a CSV export.");
  }
  if (isPdf(file)) {
    const { readPdfLines } = await import('./pdf');
    return prepareStatement({ lines: await readPdfLines(file) });
  }
  if (isCsv(file)) {
    return prepareStatement({ csvText: await readFileAsText(file) });
  }
  if (/^image\//.test(file.type || '')) {
    throw new UnsupportedFileError("Photos aren't supported yet. Download the statement PDF from your bank's website, or export a CSV.");
  }
  throw new UnsupportedFileError('SmartMoney reads PDF statements and CSV exports.');
};
