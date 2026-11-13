/**
 * Renders the computed financial picture as the block of text the model reads.
 *
 * A port of FinancialPictureRenderer.java, kept deliberately faithful: the same
 * headings, the same order, the same number formatting. The prompt file is
 * shared verbatim between the two, and it refers to these sections by name, so
 * a paraphrase here would quietly change what the model is told.
 *
 * Deliberately terse: labelled lines rather than prose or raw JSON, so the
 * figures are unambiguous and cheap in tokens. Sections with nothing to say are
 * omitted entirely rather than padded with "none" — an absent section says less
 * to the model than an empty one.
 *
 * Falls back to the five headline figures when an older client sends no context.
 */

const NOT_PROVIDED = 'Not provided';

/** JSON gives us undefined for an absent key where Java had null. */
const missing = (value) => value === null || value === undefined;

const isEmpty = (list) => !Array.isArray(list) || list.length === 0;

/**
 * 2.9 rather than 2.9000000000000004, and 30 rather than 30.0.
 *
 * Mirrors Java's `String.valueOf(double)` on the rounded value, which always
 * keeps a decimal point: 3.04 renders as "3.0", not "3".
 */
const trim = (value) => {
  if (Number.isInteger(value)) return String(value);
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}.0` : String(rounded);
};

const money = (value) => {
  if (missing(value)) return NOT_PROVIDED;
  // A negative net worth reads as -$15,000.00, not $-15,000.00.
  const formatted = `$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  return value < 0 ? `-${formatted}` : formatted;
};

const pct = (value) => (missing(value) ? NOT_PROVIDED : `${trim(value)}%`);

const number = (value) => (missing(value) ? NOT_PROVIDED : trim(value));

const blank = (value) => typeof value !== 'string' || value.trim() === '';

const orNotProvided = (value) => (blank(value) ? NOT_PROVIDED : value);

const appendMetrics = (out, m) => {
  if (!m) return;
  out.push('MONTHLY CASH FLOW');
  out.push(`  Income: ${money(m.monthlyIncome)}`);
  out.push(`  Expenses: ${money(m.monthlyExpenses)}`);
  out.push(`  Surplus: ${money(m.monthlySurplus)}`);
  out.push(`  Savings rate: ${pct(m.savingsRatePct)}`);
  out.push('');
  out.push('POSITION');
  out.push(`  Reachable savings: ${money(m.liquidSavings)}`);
  out.push(`  Total debt: ${money(m.totalDebt)}`);
  out.push(`  Debt as share of annual income: ${pct(m.debtToIncomePct)}`);
  out.push(`  Emergency fund: ${number(m.emergencyFundMonths)} months of expenses`);
  out.push(`  Net worth: ${money(m.netWorth)}`);
  out.push('');
};

const appendHealthScore = (out, score) => {
  if (!score) return;
  out.push(`FINANCIAL HEALTH SCORE: ${score.total}/100 (${score.rating})`);
  if (Array.isArray(score.components)) {
    score.components.forEach((component) => {
      out.push(`  ${component.name}: ${component.score}/${component.max}`);
    });
  }
  out.push('');
};

const appendDebts = (out, debts) => {
  if (isEmpty(debts)) return;
  out.push('DEBTS');
  debts.forEach((debt) => {
    let line = `  ${debt.name} (${debt.type}): ${money(debt.balance)}`
      + ` at ${pct(debt.aprPct)} APR, minimum ${money(debt.minPayment)}`;
    if (debt.neverPaidOffAtMinimum === true) {
      line += "  <-- the minimum does not cover this debt's interest, so it never gets paid off";
    }
    out.push(line);
  });
  out.push('');
};

const appendPayoffLine = (out, label, payoff) => {
  if (!payoff) return;
  if (payoff.clearsWithinProjection === false) {
    out.push(`  ${label}: not cleared within the 50-year projection`);
    return;
  }
  out.push(`  ${label}: ${payoff.months} months, ${money(payoff.totalInterest)} total interest`);
};

const appendPayoff = (out, payoff) => {
  if (!payoff) return;
  out.push('DEBT PAYOFF, ALREADY CALCULATED');
  appendPayoffLine(out, `At ${money(payoff.extraPayment)}/mo extra, avalanche`, payoff.avalanche);
  appendPayoffLine(out, `At ${money(payoff.extraPayment)}/mo extra, snowball`, payoff.snowball);
  appendPayoffLine(
    out,
    `At the recommended ${money(payoff.recommendedExtraPayment)}/mo extra, avalanche`,
    payoff.atRecommendedPayment,
  );
  out.push('  Any other payment amount is NOT calculated here - see guardrail 4.');
  out.push('');
};

const appendGoals = (out, goals) => {
  if (isEmpty(goals)) return;
  out.push('GOALS');
  goals.forEach((goal) => {
    let line = `  ${goal.name}`;
    if (!missing(goal.targetAmount) && goal.targetAmount > 0) line += `: ${money(goal.targetAmount)}`;
    if (!blank(goal.targetDate)) line += ` by ${goal.targetDate}`;
    out.push(line);
  });
  out.push('');
};

const appendList = (out, heading, items) => {
  if (isEmpty(items)) return;
  out.push(heading);
  items.forEach((item) => out.push(`  ${item}`));
  out.push('');
};

const appendMissing = (out, missingSections, completenessPct) => {
  if (isEmpty(missingSections)) return;
  out.push('STILL MISSING (ask for these; never assume them)');
  missingSections.forEach((item) => out.push(`  ${item}`));
  if (!missing(completenessPct)) {
    out.push(`  Profile is ${completenessPct}% complete.`);
  }
  out.push('');
};

/**
 * The latest statement, as the client summarised it: derived figures and
 * merchant names only. Strings are scrubbed again here (emails, long digit
 * runs, line breaks) and every list is capped, whatever the client sent.
 */
const clean = (value, max = 160) =>
  String(value ?? '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '')
    .replace(/\d{6,}/g, '#')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, max);

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const list = (value, max) => (Array.isArray(value) ? value.slice(0, max) : []);
const named = (item, field = 'name') => `${clean(item[field], 40)} ${money(item.amount)}`;
const monthsText = (months) => `${months} month${months === 1 ? '' : 's'}`;

const appendStatement = (out, statement) => {
  if (!statement || typeof statement !== 'object') return;
  out.push('LATEST STATEMENT (read and sorted by the app; quote these, do not recompute them)');
  const period = statement.period || {};
  if (!blank(period.start) && !blank(period.end)) {
    out.push(`  Period: ${clean(period.start, 10)} to ${clean(period.end, 10)}${isNumber(statement.transactionCount) ? `, ${statement.transactionCount} transactions` : ''}`);
  }
  if (isNumber(statement.totalSpent)) out.push(`  Total spent: ${money(statement.totalSpent)}`);

  const categories = list(statement.categories, 12).filter((item) => isNumber(item.amount));
  if (categories.length) out.push(`  By category: ${categories.map((item) => named(item)).join('; ')}`);

  const subscriptions = list(statement.subscriptions, 20).filter((item) => isNumber(item.amount));
  if (subscriptions.length) {
    const total = subscriptions.reduce((sum, item) => sum + item.amount, 0);
    out.push(`  Subscriptions (${subscriptions.length}, ${money(total)} in all), biggest first: ${subscriptions.map((item) => named(item)).join('; ')}`);
  }

  const fees = list(statement.feesAndInterest, 10).filter((item) => isNumber(item.amount));
  if (fees.length) out.push(`  Interest and fees: ${fees.map((item) => named(item)).join('; ')}`);

  const duplicates = list(statement.possibleDuplicates, 5).filter((item) => isNumber(item.amount));
  if (duplicates.length) {
    out.push(`  Possible duplicate charges: ${duplicates.map((item) => `${clean(item.merchant, 40)} ${money(item.amount)} x${Number(item.count) || 2} on ${clean(item.date, 10)}`).join('; ')}`);
  }

  const fixes = list(statement.fixes, 8);
  if (fixes.length) {
    out.push(`  Fixes the app found${isNumber(statement.fixesMonthlyTotal) ? ` (${money(statement.fixesMonthlyTotal)}/mo of savings in all)` : ''}:`);
    fixes.forEach((fix) => {
      const value = isNumber(fix.refund) ? `${money(fix.refund)} back` : isNumber(fix.monthlySaving) ? `${money(fix.monthlySaving)}/mo` : '';
      out.push(`    - ${clean(fix.title, 60)}${value ? `: ${value}` : ''}. ${clean(fix.detail)}`);
    });
  }
  out.push('');

  const plan = statement.plan;
  if (plan && isNumber(plan.extraPayment) && isNumber(plan.months)) {
    out.push('PLAN ON SCREEN (the user sees this plan; use it, and do not offer a different payment plan unless they ask)');
    const basis = plan.basis === 'budget' && isNumber(plan.monthlySurplus)
      ? `sized from the ${money(plan.monthlySurplus)} monthly surplus`
      : "funded by the fixes, because spending and bills use up what comes in";
    const result = plan.clears === false ? 'not cleared within the 50-year projection' : `debt-free in ${monthsText(plan.months)}, ${money(plan.totalInterest)} total interest`;
    out.push(`  ${money(plan.extraPayment)}/mo extra toward debt, ${basis}: ${result}`);
    if (plan.minimumsNeverClear === true) {
      out.push('  On minimum payments alone the debt never gets paid off; there is no "months sooner" comparison.');
    }
    const boost = plan.withFixes;
    if (boost && isNumber(boost.extraPayment) && isNumber(boost.months) && boost.clears !== false) {
      out.push(`  With the fixes added (${money(boost.extraPayment)}/mo extra): debt-free in ${monthsText(boost.months)}, ${money(boost.totalInterest)} total interest`);
    }
    out.push('');
  }
};

const renderHeadlineFiguresOnly = (data) => {
  const safe = data || {};
  return [
    `Monthly Income: $${orNotProvided(safe.monthlyIncome)}`,
    `Monthly Expenses: $${orNotProvided(safe.monthlyExpenses)}`,
    `Current Savings: $${orNotProvided(safe.savings)}`,
    `Outstanding Debts: $${orNotProvided(safe.debts)}`,
    `Financial Goals: ${orNotProvided(safe.goals)}`,
    '',
    'Only these headline figures are available for this request; nothing',
    'else has been calculated, so do not quote figures beyond them.',
  ].join('\n');
};

const renderFinancialPicture = (context, data) => {
  if (!context) return renderHeadlineFiguresOnly(data);

  const out = [];
  appendMetrics(out, context.metrics);
  appendHealthScore(out, context.healthScore);
  appendDebts(out, context.debts);
  appendPayoff(out, context.debtPayoff);
  appendGoals(out, context.goals);
  appendStatement(out, context.statement);
  appendList(out, 'COVERAGE GAPS', context.protectionGaps);
  appendMissing(out, context.missing, context.completenessPct);

  const rendered = out.join('\n');
  return rendered.trim() === '' ? renderHeadlineFiguresOnly(data) : rendered;
};

module.exports = { renderFinancialPicture };
