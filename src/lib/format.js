/** Presentation helpers. No financial logic lives here. */

export const formatCurrency = (amount) => `$${Number(amount).toFixed(2)}`;

const plural = (count, noun) => `${count} ${noun}${count > 1 ? 's' : ''}`;

/** "2 years, 3 months" — omits either half when it is zero. */
export const formatDuration = (years, months) => {
  const parts = [];
  if (years > 0) parts.push(plural(years, 'year'));
  if (months > 0) parts.push(plural(months, 'month'));
  return parts.join(', ');
};
