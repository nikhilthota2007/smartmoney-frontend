/**
 * What the advisor is told about the latest statement.
 *
 * Derived figures and merchant names only: category totals, subscriptions,
 * fees and interest, possible duplicate charges, the fixes, and the plan the
 * page shows. Never the cardholder's name, address, email, phone, or account
 * or card numbers; the descriptions these come from were already redacted on
 * the device, and names pass through one more scrub here.
 */
const round2 = (n) => Math.round(n * 100) / 100;

/** Merchant names come from redacted descriptions; strip any placeholder or long number left. */
export const safeName = (name) =>
  String(name || '')
    .replace(/\[(person|name)\]/gi, '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '')
    .replace(/[•#]*\d{4,}/g, '')
    .replace(/•+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 40) || 'Unnamed';

const payoffFigures = (result) =>
  result && {
    months: result.avalanche.months,
    totalInterest: round2(result.avalanche.totalInterest),
    clears: result.avalanche.clearsWithinProjection !== false,
  };

export const statementBrief = (analysis, plan) => {
  if (!analysis) return null;
  return {
    period: { start: analysis.periodStart, end: analysis.periodEnd, days: analysis.days },
    transactionCount: analysis.transactionCount,
    totalSpent: analysis.total,
    monthlySpent: analysis.monthly,
    categories: analysis.categories.slice(0, 12).map((entry) => ({ name: entry.label, amount: entry.total })),
    subscriptions: analysis.subscriptions.slice(0, 20).map((item) => ({ name: safeName(item.name), amount: item.amount })),
    feesAndInterest: analysis.feesAndInterest.slice(0, 10).map((item) => ({ name: safeName(item.name), amount: item.amount })),
    possibleDuplicates: analysis.duplicates.slice(0, 5).map((item) => ({
      merchant: safeName(item.merchant),
      amount: item.amount,
      date: item.date,
      count: item.count,
    })),
    fixes: analysis.fixes.map((fix) =>
      fix.kind === 'refund'
        ? { title: fix.title, detail: fix.detail, refund: fix.refund }
        : { title: fix.title, detail: fix.detail, monthlySaving: fix.saving }
    ),
    fixesMonthlyTotal: analysis.monthlySaving,
    plan:
      plan && plan.basis && plan.result
        ? {
            basis: plan.basis,
            monthlySurplus: round2(plan.monthlySurplus),
            extraPayment: plan.extraPayment,
            ...payoffFigures(plan.result),
            minimumsNeverClear:
              plan.result.avalanche.months + (plan.result.comparedToMinimumsOnly.monthsSaved || 0) >= 600,
            withFixes: plan.withFixes
              ? { extraPayment: plan.withFixes.extraPayment, ...payoffFigures(plan.withFixes.result) }
              : null,
          }
        : null,
  };
};
