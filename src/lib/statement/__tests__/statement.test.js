import fs from 'fs';
import path from 'path';
import { parseAmount, parseDate, parseStatementText } from '../parse';
import { parseStatementCsv } from '../csv';
import { findHolderNames, redactDescription } from '../redact';
import { categorizeLocally } from '../categories';
import { itemsToLines } from '../pdfLines';
import { analyzeSpending, monthlyFactor } from '../analyze';
import { applyCategories, prepareStatement } from '..';

// pdf.js's text for a fictional card statement (scripts/make-sample-statement.js).
const LINES = fs
  .readFileSync(path.join(__dirname, '../__fixtures__/northwind-statement.txt'), 'utf8')
  .split('\n');

describe('parse', () => {
  it('reads amounts with signs, commas and CR', () => {
    expect(parseAmount('$1,234.56')).toBe(1234.56);
    expect(parseAmount('-$250.00')).toBe(-250);
    expect(parseAmount('45.10 CR')).toBe(-45.1);
    expect(parseAmount('12.00-')).toBe(-12);
  });

  it('reads numeric and named dates', () => {
    expect(parseDate('03/14')).toEqual({ month: 3, day: 14, year: null });
    expect(parseDate('04/01/2026')).toEqual({ month: 4, day: 1, year: 2026 });
    expect(parseDate('Mar 9, 2026')).toEqual({ month: 3, day: 9, year: 2026 });
    expect(parseDate('13/40')).toBeNull();
  });

  it('finds every transaction line and nothing else', () => {
    const { transactions } = parseStatementText(LINES);
    expect(transactions).toHaveLength(31);
    expect(transactions[0]).toEqual({ date: '2026-03-02', description: 'SPOTIFY USA 877-778-1161 NY', amount: 11.99 });
    expect(transactions.find((t) => /PAYMENT THANK YOU/.test(t.description)).amount).toBe(-250);
    // The summary box and the APR table are not transactions.
    expect(transactions.some((t) => /balance|purchases|cash advances/i.test(t.description))).toBe(false);
  });

  it('reads the card summary', () => {
    expect(parseStatementText(LINES).summary).toEqual({
      kind: 'card',
      issuer: 'Northwind Bank Platinum Rewards Card',
      periodStart: '2026-03-02',
      periodEnd: '2026-04-01',
      newBalance: 4768.67,
      minimumPayment: 142,
      dueDate: '2026-04-26',
      apr: 27.49,
    });
  });

  it('puts December purchases on a January statement in the previous year', () => {
    const { transactions } = parseStatementText([
      'Opening/Closing Date 12/20/2025 - 01/19/2026',
      '12/28  WHOLE FOODS #10 AUSTIN TX  $40.00',
      '01/03  NETFLIX.COM  $15.49',
    ]);
    expect(transactions.map((t) => t.date)).toEqual(['2025-12-28', '2026-01-03']);
  });
});

describe('pdf lines', () => {
  it('joins fragments on one baseline, top to bottom, with column gaps', () => {
    const lines = itemsToLines([
      { str: '$11.99', x: 500, y: 600, width: 30, height: 10 },
      { str: '03/02', x: 40, y: 600, width: 25, height: 10 },
      { str: 'SPOTIFY USA', x: 120, y: 601, width: 60, height: 10 },
      { str: 'Transactions', x: 40, y: 640, width: 60, height: 10 },
    ]);
    expect(lines).toEqual(['Transactions', '03/02  SPOTIFY USA  $11.99']);
  });
});

describe('csv', () => {
  it('reads an export with purchases as negatives and flips them', () => {
    const csv = [
      'Transaction Date,Post Date,Description,Category,Type,Amount,Memo',
      '03/02/2026,03/03/2026,SPOTIFY USA,Entertainment,Sale,-11.99,',
      '03/03/2026,03/04/2026,"UBER *EATS, PENDING",Food & Drink,Sale,-34.18,',
      '03/15/2026,03/15/2026,Payment Thank You-Mobile,,Payment,250.00,',
    ].join('\n');
    const { transactions, summary } = parseStatementCsv(csv);
    expect(transactions.map((t) => t.amount)).toEqual([11.99, 34.18, -250]);
    expect(transactions[1].description).toBe('UBER *EATS, PENDING');
    expect(summary.periodStart).toBe('2026-03-02');
  });

  it('reads separate debit and credit columns and ignores the card number', () => {
    const csv = [
      'Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit',
      '2026-03-04,2026-03-05,5521,TRADER JOE S #552,Groceries,86.42,',
      '2026-03-15,2026-03-15,5521,CAPITAL ONE AUTOPAY PYMT,Payment,,250.00',
    ].join('\n');
    const { transactions } = parseStatementCsv(csv);
    expect(transactions).toEqual([
      { date: '2026-03-04', description: 'TRADER JOE S #552', amount: 86.42 },
      { date: '2026-03-15', description: 'CAPITAL ONE AUTOPAY PYMT', amount: -250 },
    ]);
  });

  it('explains a CSV it cannot read', () => {
    expect(() => parseStatementCsv('a,b\n1,2')).toThrow(/date, description and amount/);
  });
});

describe('redaction', () => {
  it('masks card numbers, phone numbers, emails and long references', () => {
    expect(redactDescription('PAYMENT FROM 4147 2023 8811 5521')).toBe('PAYMENT FROM ••••5521');
    expect(redactDescription('SPOTIFY USA 877-778-1161 NY')).toBe('SPOTIFY USA NY');
    expect(redactDescription('REFUND jordan.rivera@example.com')).toBe('REFUND');
    expect(redactDescription('AMAZON MKTPL*2K4LQ8ZR0 AMZN.COM/BILL WA')).toBe('AMAZON MKTPL*# AMZN.COM/BILL WA');
  });

  it('hides the other person in payment-app transfers', () => {
    expect(redactDescription('ZELLE TO MARIA GONZALEZ')).toBe('ZELLE TO [person]');
    expect(redactDescription('Venmo payment from Sam Lee')).toBe('Venmo payment from [person]');
  });

  it('finds the cardholder above the address and scrubs them', () => {
    const names = findHolderNames(LINES);
    expect(names).toEqual(expect.arrayContaining(['JORDAN A. RIVERA', 'RIVERA', 'JORDAN']));
    expect(redactDescription('REFUND FOR JORDAN RIVERA', { names })).toBe('REFUND FOR [name] [name]');
  });
});

describe('prepareStatement', () => {
  const prepared = prepareStatement({ lines: LINES });

  it('never carries the name, address or account number', () => {
    const everything = JSON.stringify(prepared);
    ['RIVERA', 'MAPLEWOOD', '8811', 'jordan.rivera', '555-0148', 'GONZALEZ'].forEach((secret) => {
      expect(everything).not.toContain(secret);
    });
  });

  it('recognises every merchant on this statement on the device', () => {
    expect(prepared.unknown).toEqual([]);
    const byDescription = Object.fromEntries(prepared.transactions.map((t) => [t.description, t.category]));
    expect(byDescription['UBER *EATS PENDING SAN FRANCISCO CA']).toBe('delivery');
    expect(byDescription['UBER *TRIP HELP.UBER.COM CA']).toBe('transport');
    expect(byDescription['PLANET FITNESS CLUB FEES NH']).toBe('subscriptions');
    expect(byDescription['LATE FEE']).toBe('fees_interest');
    expect(byDescription['PAYMENT THANK YOU - WEB']).toBe('payment');
  });

  it('sends only redacted descriptions and amounts for what it does not know', () => {
    const { unknown, transactions } = prepareStatement({
      lines: ['03/02  NEIGHBOURHOOD THING 4412 AUSTIN TX  $19.00', '03/03  NETFLIX.COM  $15.49'],
    });
    expect(unknown).toEqual([{ id: 1, description: 'NEIGHBOURHOOD THING 4412 AUSTIN TX', amount: 19 }]);
    expect(applyCategories(transactions, { 1: 'dining' })[0].category).toBe('dining');
    expect(applyCategories(transactions, { 1: 'made-up' })[0].category).toBe('other');
  });
});

describe('categorizeLocally', () => {
  it('treats money in as a payment or credit', () => {
    expect(categorizeLocally({ description: 'AMAZON REFUND', amount: -20 })).toBe('payment');
  });

  it('returns null for merchants it does not know', () => {
    expect(categorizeLocally({ description: 'QWERTY LLC', amount: 12 })).toBeNull();
  });
});

describe('analyzeSpending', () => {
  const { transactions, summary } = prepareStatement({ lines: LINES });
  const analysis = analyzeSpending({ transactions, summary }, { monthlyIncome: 3400 });

  it('treats a 31-day statement as one month', () => {
    expect(monthlyFactor('2026-03-02', '2026-04-01')).toBe(1);
    expect(monthlyFactor('2026-03-01', '2026-03-15')).toBeCloseTo(2.03, 2);
  });

  it('totals spending without the payment', () => {
    // Every listed charge, including the late fee and interest; not the payment.
    expect(analysis.total).toBe(1118.61);
    expect(analysis.categories[0]).toMatchObject({ category: 'groceries', total: 273.2, count: 3 });
    expect(analysis.categories.find((c) => c.category === 'delivery')).toMatchObject({ total: 183.79, count: 6 });
    expect(analysis.interestAndFees).toBe(122.41);
    expect(analysis.incomeShare).toBeCloseTo(1118.61 / 3400, 5);
  });

  it('proposes the late-fee fix first, then the biggest estimates', () => {
    expect(analysis.fixes.map((fix) => [fix.id, fix.saving])).toEqual([
      ['late-fee', 29],
      ['delivery', 90],
      ['shopping', 50],
      ['subscriptions', 25],
    ]);
    expect(analysis.monthlySaving).toBe(194);
  });
});
