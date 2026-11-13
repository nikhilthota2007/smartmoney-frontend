/**
 * A statement shaped like the one used to test the preview: a card at
 * $4,701.40 and 24.99% APR with a $95 minimum, eight subscriptions (one of
 * them a study service), a double charge, and both shopping and personal care.
 */
import { parseStatementCsv } from '../csv';
import { analyzeSpending, findDuplicates, findSubscriptionIds } from '../analyze';
import { prepareStatement } from '..';

const CSV = [
  'Date,Description,Category,Amount',
  '10/01/2026,NETFLIX.COM,Entertainment,15.49',
  '10/02/2026,SPOTIFY USA,Entertainment,11.99',
  '10/03/2026,HULU 877-8244858,Entertainment,7.99',
  '10/03/2026,APPLE.COM/BILL,Shopping,2.99',
  '10/04/2026,CHEGG STUDY,Education,15.95',
  '10/05/2026,AMAZON MKTPL*2K4LQ8ZR0,Shopping,47.99',
  '10/05/2026,AMAZON MKTPL*7B21XQ93P,Shopping,47.99',
  '10/06/2026,PLANET FITNESS CLUB FEES,Health,24.99',
  '10/07/2026,YOUTUBE PREMIUM,Entertainment,13.99',
  '10/08/2026,PARAMOUNT+ STREAMING,Entertainment,7.99',
  '10/09/2026,TARGET 00023,Shopping,58.02',
  '10/10/2026,SEPHORA.COM,Shopping,46.10',
  '10/11/2026,STARBUCKS STORE 10392,Food,6.45',
  '10/14/2026,STARBUCKS STORE 10392,Food,6.45',
  '10/15/2026,TRADER JOE S #552,Groceries,92.10',
  '10/20/2026,PAYMENT THANK YOU,Payment,-95.00',
].join('\n');

const { transactions } = prepareStatement({ csvText: CSV });
const analysis = analyzeSpending({ transactions, summary: parseStatementCsv(CSV).summary });

describe('duplicate charges', () => {
  it('flags the same merchant, amount and day, even with different order codes', () => {
    expect(findDuplicates(transactions)).toEqual([
      { merchant: 'Amazon', date: '2026-10-05', amount: 47.99, count: 2, extra: 47.99 },
    ]);
  });

  it('turns it into a refund to ask for, not a monthly saving', () => {
    const fix = analysis.fixes.find((item) => item.kind === 'refund');
    expect(fix.title).toBe('Possible duplicate charge');
    expect(fix.detail).toBe('$47.99 from Amazon on Oct 5, twice. If you only bought it once, ask for a refund.');
    expect(fix.refund).toBe(47.99);
    expect(fix.saving).toBe(0);
    expect(analysis.possibleRefunds).toBe(47.99);
  });

  it('does not flag the same coffee on different days', () => {
    expect(analysis.duplicates.some((item) => item.merchant === 'Starbucks')).toBe(false);
  });
});

describe('subscriptions', () => {
  it('finds all eight, including the study service sorted as education', () => {
    expect(analysis.subscriptions.map((item) => item.name).sort()).toEqual(
      ['Apple', 'Chegg', 'Hulu', 'Netflix', 'Paramount+', 'Planet Fitness', 'Spotify', 'YouTube'].sort()
    );
    expect(analysis.categories.find((entry) => entry.category === 'subscriptions').total).toBe(101.38);
  });

  it('spots a repeating charge from a merchant it has never heard of', () => {
    const ids = findSubscriptionIds([
      { id: 1, date: '2026-10-01', description: 'ZORBLAX CLOUD', amount: 9.0, category: 'other' },
      { id: 2, date: '2026-10-15', description: 'ZORBLAX CLOUD', amount: 9.0, category: 'other' },
    ]);
    expect([...ids]).toEqual([1, 2]);
  });
});

describe('one definition per figure', () => {
  it('quotes the same shopping total in the fix as in the bar', () => {
    const bar = analysis.categories.find((entry) => entry.category === 'shopping');
    const fix = analysis.fixes.find((item) => item.id === 'shopping');
    // Amazon twice, plus Target. Sephora is Personal care, its own bar.
    expect(bar.total).toBe(154);
    expect(fix.detail).toContain('Shopping came to $154.');
  });

  it('quotes the same subscription total in the fix as in the bar', () => {
    expect(analysis.fixes.find((item) => item.id === 'subscriptions').detail).toContain('came to $101.');
  });
});
