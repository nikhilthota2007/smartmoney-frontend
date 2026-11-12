import { formatCurrency, formatDuration } from '../format';

describe('formatCurrency', () => {
  it('groups thousands and shows cents only when there are some', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
    expect(formatCurrency(5000)).toBe('$5,000');
    expect(formatCurrency(0)).toBe('$0');
  });

  it('rounds to the cent before deciding', () => {
    expect(formatCurrency(41.666)).toBe('$41.67');
    expect(formatCurrency(99.999)).toBe('$100');
  });

  it('puts the sign before the dollar sign', () => {
    expect(formatCurrency(-250)).toBe('-$250');
  });
});

describe('formatDuration', () => {
  it('renders years and months together', () => {
    expect(formatDuration(2, 3)).toBe('2 years, 3 months');
  });

  it('singularises', () => {
    expect(formatDuration(1, 1)).toBe('1 year, 1 month');
  });

  it('omits a zero half', () => {
    expect(formatDuration(0, 7)).toBe('7 months');
    expect(formatDuration(4, 0)).toBe('4 years');
  });

  it('renders nothing when the payoff is immediate', () => {
    expect(formatDuration(0, 0)).toBe('');
  });
});
