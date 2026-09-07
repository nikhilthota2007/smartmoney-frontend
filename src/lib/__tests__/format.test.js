import { formatCurrency, formatDuration } from '../format';

describe('formatCurrency', () => {
  it('always shows two decimal places', () => {
    expect(formatCurrency(1234.5)).toBe('$1234.50');
    expect(formatCurrency(0)).toBe('$0.00');
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
