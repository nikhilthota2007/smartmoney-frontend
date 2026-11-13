/**
 * What the advisor is told about a statement, how it is told to talk, and the
 * error a rate limit produces.
 */
import fs from 'fs';
import path from 'path';
import chat, { GENERIC_ERROR, RATE_LIMITED } from '../../../api/chat.js';
import statementHandler from '../../../api/statement.js';
import { renderFinancialPicture as pictureFor } from '../../../api/_lib/picture.js';
import { PROMPT_TEMPLATE } from '../../../api/_lib/prompt.js';
import { analyzeSpending, prepareStatement } from '../statement';
import { safeName, statementBrief } from '../statement/brief';

const mockResponse = () => {
  const res = { statusCode: null, body: null, headers: {} };
  res.setHeader = (name, value) => { res.headers[name] = value; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

const BRIEF = {
  period: { start: '2026-10-01', end: '2026-10-31', days: 31 },
  transactionCount: 41,
  totalSpent: 1180.5,
  categories: [{ name: 'Groceries', amount: 310.2 }, { name: 'Subscriptions', amount: 101.38 }],
  subscriptions: [{ name: 'Netflix', amount: 15.49 }, { name: 'Chegg', amount: 15.95 }],
  feesAndInterest: [{ name: 'Purchase Interest Charge', amount: 97.91 }],
  possibleDuplicates: [{ merchant: 'Amazon', amount: 47.99, date: '2026-10-05', count: 2 }],
  fixes: [
    { title: 'Possible duplicate charge', detail: '$47.99 from Amazon on Oct 5, twice.', refund: 47.99 },
    { title: 'Halve the delivery orders', detail: '6 delivery orders came to $184.', monthlySaving: 90 },
  ],
  fixesMonthlyTotal: 115,
  plan: {
    basis: 'budget',
    monthlySurplus: 1310,
    extraPayment: 400,
    months: 13,
    totalInterest: 640.12,
    clears: true,
    minimumsNeverClear: true,
    withFixes: { extraPayment: 515, months: 10, totalInterest: 498.3, clears: true },
  },
};

describe('LATEST STATEMENT and PLAN ON SCREEN', () => {
  const picture = pictureFor({ metrics: { monthlySurplus: 1310 }, statement: BRIEF }, null);

  it('lists what the page found, by name and amount', () => {
    expect(picture).toContain('LATEST STATEMENT');
    expect(picture).toContain('Subscriptions (2, $31.44 in all), biggest first: Netflix $15.49; Chegg $15.95');
    expect(picture).toContain('Possible duplicate charges: Amazon $47.99 x2 on 2026-10-05');
    expect(picture).toContain('Interest and fees: Purchase Interest Charge $97.91');
    expect(picture).toContain('- Possible duplicate charge: $47.99 back.');
    expect(picture).toContain('- Halve the delivery orders: $90.00/mo.');
  });

  it('states the plan on screen, and that minimums never clear it', () => {
    expect(picture).toContain('PLAN ON SCREEN');
    expect(picture).toContain('$400.00/mo extra toward debt, sized from the $1,310.00 monthly surplus: debt-free in 13 months');
    expect(picture).toContain('never gets paid off');
    expect(picture).toContain('With the fixes added ($515.00/mo extra): debt-free in 10 months');
  });

  it('scrubs anything that slipped into a string and caps the lists', () => {
    const leaky = pictureFor(
      {
        statement: {
          subscriptions: Array.from({ length: 30 }, (_, i) => ({ name: `Svc ${i} jo@x.com 41472023881155`, amount: 1 })),
        },
      },
      null
    );
    expect(leaky).not.toContain('jo@x.com');
    expect(leaky).not.toContain('41472023881155');
    expect(leaky).toContain('Subscriptions (20,');
  });

  it('says nothing about a statement when there is none', () => {
    expect(pictureFor({ metrics: { monthlySurplus: 1 } }, null)).not.toContain('LATEST STATEMENT');
  });
});

describe('the brief the browser sends', () => {
  const lines = fs
    .readFileSync(path.join(__dirname, '../statement/__fixtures__/northwind-statement.txt'), 'utf8')
    .split('\n');
  const { transactions, summary } = prepareStatement({ lines });
  const brief = statementBrief(analyzeSpending({ transactions, summary }), null);

  it('carries derived figures and merchant names, never personal details', () => {
    const sent = JSON.stringify(brief);
    ['RIVERA', 'Jordan', 'MAPLEWOOD', '78745', '8811', '5521', 'jordan.rivera', '555-0148', 'GONZALEZ'].forEach((secret) => {
      expect(sent).not.toContain(secret);
    });
    expect(brief.subscriptions.map((item) => item.name)).toEqual(
      expect.arrayContaining(['Planet Fitness', 'Netflix', 'Spotify', 'Hulu', 'Apple'])
    );
    expect(brief.plan).toBeNull();
  });

  it('cleans placeholders and long numbers out of names', () => {
    expect(safeName('Zelle To [person]')).toBe('Zelle To');
    expect(safeName('Store ••••5521')).toBe('Store');
  });
});

describe('the v7 voice', () => {
  it('speaks as SmartMoney and leads with the user’s numbers', () => {
    expect(PROMPT_TEMPLATE).toContain("SmartMoney's money advisor");
    expect(PROMPT_TEMPLATE).toContain('Lead with THEIR numbers');
    expect(PROMPT_TEMPLATE).toContain('warm, a little witty, honest about money');
  });

  it('keeps the disclaimer short and out of the opening', () => {
    expect(PROMPT_TEMPLATE).toContain('Never\n   open an answer with a disclaimer');
    expect(PROMPT_TEMPLATE).not.toContain('Say so plainly the first time you give substantive guidance');
  });

  it('answers from the statement and the plan on screen', () => {
    expect(PROMPT_TEMPLATE).toContain('Never ask the user to list subscriptions');
    expect(PROMPT_TEMPLATE).toContain('Do not present a different monthly surplus');
  });
});

describe('rate limits', () => {
  const originalKey = process.env.GROQ_API_KEY;
  let errorLog;
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'gsk_test';
    errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    process.env.GROQ_API_KEY = originalKey;
    errorLog.mockRestore();
    global.fetch = undefined;
  });

  const rejectWith = (status) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status, text: async () => '{"error":"x"}' });
  };

  it('says plainly when the shared model is rate limited', async () => {
    rejectWith(429);
    const res = mockResponse();
    await chat({ method: 'POST', body: { message: 'hi' }, headers: {} }, res);
    expect(res.body).toEqual({ response: null, success: false, error: RATE_LIMITED });
    expect(RATE_LIMITED).toBe("I'm getting a lot of questions right now. Try again in a minute.");
  });

  it('keeps the generic message, said once, for other failures', async () => {
    rejectWith(500);
    const res = mockResponse();
    await chat({ method: 'POST', body: { message: 'hi' }, headers: {} }, res);
    expect(res.body.error).toBe(GENERIC_ERROR);
  });

  it('says the same when sorting a statement hits the limit', async () => {
    rejectWith(429);
    const res = mockResponse();
    await statementHandler({ method: 'POST', body: { items: [{ id: 1, description: 'X', amount: 1 }] }, headers: {} }, res);
    expect(res.body.error).toBe(RATE_LIMITED);
  });
});
