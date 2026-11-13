import React from 'react';
import { AlertTriangle, ArrowDownRight, PieChart, Wand2 } from 'lucide-react';
import { useStatement } from '../../app/StatementContext';
import { useProfile } from '../../context/ProfileContext';
import { executeTool } from '../../lib/tools';
import { deriveSummary } from '../../lib/profile';
import { deriveMetrics } from '../../lib/derive';
import { filterValidDebts } from '../../lib/planner/debt';
import { findUnpayableDebts } from '../../lib/planner/debtWarnings';
import { debtPlan } from '../../lib/statement/plan';
import PayoffCard from '../cards/PayoffCard';
import GoalCard from '../cards/GoalCard';
import ProjectionCard from '../cards/ProjectionCard';
import { money, monthLabel } from '../cards/display';
import { formatCurrency } from '../../lib/format';

const shortDate = (iso) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

/** Where the money went: the biggest categories as bars. */
export const SpendingCard = ({ analysis, summary }) => {
  const top = analysis.categories.slice(0, 6);
  const largest = top.length ? top[0].total : 1;
  return (
    <article className="card insight-card" aria-label="Where it went">
      <header className="tool-card-head">
        <span className="eyebrow">
          <PieChart size={14} aria-hidden="true" />
          Where it went · {shortDate(analysis.periodStart)} to {shortDate(analysis.periodEnd)}
        </span>
      </header>
      <div className="tool-card-hero">
        <span className="figure">{money(analysis.total)}</span>
        <span className="tool-card-label">
          spent across {analysis.transactionCount} transactions
          {analysis.incomeShare ? `, ${Math.round(analysis.incomeShare * 100)}% of what comes in` : ''}
        </span>
      </div>
      <ul className="spend-list">
        {top.map((entry) => (
          <li key={entry.category}>
            <div className="spend-row">
              <span>{entry.label}</span>
              <span className="tabular">{money(entry.total)}</span>
            </div>
            <div className="bar" aria-hidden="true">
              <div className="bar-fill bar-grow" style={{ width: `${Math.max(3, (entry.total / largest) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
      {analysis.interestAndFees > 0 && (
        <p className="notice notice-warning">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            {money(analysis.interestAndFees)} of this was interest and fees
            {summary && summary.apr ? ` at ${summary.apr}% APR` : ''}. That is money that bought nothing.
          </span>
        </p>
      )}
    </article>
  );
};

/** The changes worth making, each with what it is worth a month. */
export const FixesCard = ({ analysis }) => (
  <article className="card insight-card" aria-label="Easy fixes">
    <header className="tool-card-head">
      <span className="eyebrow">
        <Wand2 size={14} aria-hidden="true" />
        {analysis.fixes.length === 1 ? 'One fix' : `${analysis.fixes.length} fixes`}
      </span>
      {analysis.monthlySaving > 0 && (
        <span className="chip chip-success tabular">+{money(analysis.monthlySaving)}/mo</span>
      )}
    </header>
    <ol className="fix-list">
      {analysis.fixes.map((fix) => (
        <li key={fix.id}>
          <div className="fix-head">
            <span className="fix-title">{fix.title}</span>
            {fix.kind === 'refund' ? (
              <span className="fix-saving tabular">{formatCurrency(fix.refund)} back</span>
            ) : (
              <span className="fix-saving tabular">
                <ArrowDownRight size={14} aria-hidden="true" />
                {money(fix.saving)}/mo
              </span>
            )}
          </div>
          <p className="fix-detail">{fix.detail}</p>
        </li>
      ))}
    </ol>
    <p className="card-foot">
      From this statement. Duplicate charges and late fees are exact; the rest assume the cut described.
    </p>
  </article>
);

/** What the freed-up money does for the user's goal, from the real tools. */
/**
 * The debt plan: the same one the advisor is given (lib/statement/plan.js),
 * sized from the same surplus, with the fixes as an optional boost.
 */
const DebtPlanCard = ({ saving }) => {
  const { profile } = useProfile();
  const plan = debtPlan(profile, saving);
  if (!plan || !plan.basis || !plan.result) return null;
  const unpayable = findUnpayableDebts(profile.debts);
  const boost = plan.withFixes && plan.withFixes.result;
  const sooner = boost ? plan.result.avalanche.months - boost.avalanche.months : 0;

  return (
    <div className="impact">
      <h3 className="impact-title">Your plan: {money(plan.extraPayment)} a month extra toward your debt</h3>
      <p className="impact-sub">
        {plan.basis === 'budget'
          ? `Sized from the ${money(plan.monthlySurplus)} left each month after spending and bills.`
          : "Spending and bills use up what comes in right now, so the fixes above are what fund it."}
      </p>
      <PayoffCard result={plan.result} unpayable={unpayable} />
      {boost && boost.avalanche.clearsWithinProjection && sooner > 0 && (
        <p className="impact-boost">
          Make the fixes too and add their {money(saving)} a month: debt-free by{' '}
          <strong>{monthLabel(boost.avalanche.months)}</strong>, {sooner} {sooner === 1 ? 'month' : 'months'} sooner.
        </p>
      )}
    </div>
  );
};

const ImpactCard = ({ saving }) => {
  const { profile } = useProfile();

  if (filterValidDebts(profile.debts).length > 0) return <DebtPlanCard saving={saving} />;
  if (!(saving > 0)) return null;

  const goal = profile.goals.find((item) => Number(item.targetAmount) > 0);
  const metrics = deriveMetrics(deriveSummary(profile));
  if (goal) {
    const result = executeTool(
      'evaluate_goal',
      {
        goalName: goal.name,
        targetAmount: goal.targetAmount,
        targetDate: goal.targetDate || undefined,
        currentAmount: metrics.savings,
        monthlySurplus: Math.max(0, metrics.monthlySurplus) + saving,
      },
      profile
    );
    return result.error ? null : (
      <div className="impact">
        <h3 className="impact-title">With {money(saving)} more each month</h3>
        <GoalCard result={result} />
      </div>
    );
  }

  const result = executeTool('project_savings', { monthlyContribution: saving, months: 12, initialAmount: 0 }, profile);
  return result.error ? null : (
    <div className="impact">
      <h3 className="impact-title">Saved instead, for a year</h3>
      <ProjectionCard result={result} />
    </div>
  );
};

/** The statement section of the plan. */
const StatementInsights = () => {
  const { saved, analysis } = useStatement();
  if (!saved || !analysis) return null;

  return (
    <section className="insights" aria-labelledby="insights-title">
      <h2 className="section-title" id="insights-title">
        From your statement
      </h2>
      {saved.aiFailed && (
        <p className="notice notice-warning">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>The AI couldn't sort {saved.aiSorted} of the transactions, so they're under Other for now.</span>
        </p>
      )}
      <SpendingCard analysis={analysis} summary={saved.summary} />
      {analysis.fixes.length > 0 && <FixesCard analysis={analysis} />}
      <ImpactCard saving={analysis.monthlySaving} />
    </section>
  );
};

export default StatementInsights;
