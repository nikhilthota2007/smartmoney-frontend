/**
 * Strip anything personal out of a transaction description.
 *
 * By the time this runs, parse.js has already dropped every line that is not
 * a transaction, so the statement's name, address and account number are
 * gone. This is the second layer, for what can hide inside a description:
 *
 *   - card and account numbers      → "••••1234"
 *   - emails and phone numbers      → removed
 *   - other long digit runs (refs)  → "#"
 *   - a person in a payment app     → "ZELLE TO [person]"
 *   - the cardholder's own name     → "[name]" (when the header showed it)
 */

const P2P = /\b(zelle|venmo|cash ?app|square cash|apple cash|paypal)\b(?:\s+\*)?(\s+(?:payment|transfer|sent|received|inst xfer|instant))?\s+(to|from)\s+(.+)$/i;

export const redactDescription = (text, { names = [] } = {}) => {
  let out = String(text || '');

  out = out.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '');
  // Card or account numbers: 12-19 digits, possibly grouped with spaces or dashes.
  out = out.replace(/\b(?:\d[ -]?){11,18}\d\b/g, (match) => `••••${match.replace(/\D/g, '').slice(-4)}`);
  out = out.replace(/(?:\+?1[-.\s]?)?\(?\b\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '');
  out = out.replace(/\b\d{3}-\d{7}\b/g, '');
  out = out.replace(/\b[a-z]*\d{5,}[a-z\d]*\b/gi, '#');
  // Order and reference codes: 7+ letters and digits with at least 3 digits.
  out = out.replace(/\b(?=(?:[a-z]*\d){3})(?=[a-z\d]*[a-z])[a-z\d]{7,}\b/gi, '#');

  out = out.replace(P2P, (match, app, verb, direction) => `${app}${verb || ''} ${direction} [person]`);

  names
    .filter((name) => name && name.length >= 3)
    .forEach((name) => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      out = out.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '[name]');
    });

  return out.replace(/\s{2,}/g, ' ').replace(/^[\s#*-]+|[\s*-]+$/g, '').trim().slice(0, 80);
};

const STREET = /^\d+\s+[\w.'-]+(?:\s+[\w.'-]+)*\s+(st|street|dr|drive|ave|avenue|rd|road|ln|lane|blvd|boulevard|ct|court|way|pl|place|pkwy|cir|circle|ter|terrace|hwy)\b/i;
const NAME = /^([A-Z][A-Za-z'-]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][A-Za-z'-]+){1,2})\b/;

/**
 * The cardholder's name, if the statement's address block shows it: a line
 * of two or three capitalised words sitting just above a street address.
 * Returned so it can be scrubbed from descriptions; never sent anywhere.
 */
export const findHolderNames = (lines) => {
  const names = new Set();
  lines.slice(0, 60).forEach((line, index) => {
    // The address block is the first column; a second column (account
    // details) can share the line, separated by a wide gap.
    const column = (text) => (text || '').trim().split(/\s{2,}/)[0];
    if (!STREET.test(column(lines[index + 1]))) return;
    const match = NAME.exec(column(line));
    if (!match) return;
    const full = match[1].replace(/\s+/g, ' ');
    const words = full.split(' ').filter((word) => word.replace(/\W/g, '').length >= 3);
    if (words.length < 2) return;
    names.add(full);
    words.forEach((word) => names.add(word.replace(/\.$/, '')));
  });
  return [...names];
};
