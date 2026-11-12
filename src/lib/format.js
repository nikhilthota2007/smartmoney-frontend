/** Presentation helpers. No financial logic lives here. */

const dollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const dollarsAndCents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "$5,000" for whole dollars, "$1,234.50" when there are cents. */
export const formatCurrency = (amount) => {
  const value = Number(amount);
  const wholeDollars = Math.round(value * 100) % 100 === 0;
  return (wholeDollars ? dollars : dollarsAndCents).format(value);
};

const plural = (count, noun) => `${count} ${noun}${count > 1 ? 's' : ''}`;

/** "2 years, 3 months" — omits either half when it is zero. */
export const formatDuration = (years, months) => {
  const parts = [];
  if (years > 0) parts.push(plural(years, 'year'));
  if (months > 0) parts.push(plural(months, 'month'));
  return parts.join(', ');
};
