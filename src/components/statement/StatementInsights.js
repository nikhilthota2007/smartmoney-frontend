import React from 'react';
import { AlertTriangle, ArrowDownRight, PieChart, Wand2 } from 'lucide-react';
import { useStatement } from '../../app/StatementContext';
import { useProfile } from '../../context/ProfileContext';
import { executeTool } from '../../lib/tools';
import { deriveSummary } from '../../lib/profile';
import { deriveMetrics } from '../../lib/derive';
import { filterValidDebts } from '../../lib/planner/debt';
import PayoffCard from '../cards/PayoffCard';
import GoalCard from '../cards/GoalCard';
import ProjectionCard from '../cards/ProjectionCard';
import { money } from '../cards/display';

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
      <span className="chip chip-success tabular">+{money(analysis.monthlySaving)}/mo</span>
    </header>
    <ol className="fix-list">
      {analysis.fixes.map((fix) => (
        <li key={fix.id}>
          <div className="fix-head">
            <span className="fix-title">{fix.title}</span>
            <span className="fix-saving tabular">
              <ArrowDownRight size={14} aria-hidden="true" />
              {money(fix.saving)}/mo
            </span>
          </div>
          <p className="fix-detail">{fix.detail}</p>
        </li>
      ))}
    </ol>
    <p className="card-foot">Estimates from this statement. The late-fee one is exact; the rest assume the cut described.</p>
  </article>
);

/** What the freed-up money does for the user's goal, from the real tools. */
const ImpactCard = ({ saving }) => {
  const { profile } = useProfile();
  if (!(saving > 0)) return null;

  if (filterValidDebts(profile.debts).length > 0) {
    const result = executeTool('simulate_debt_payoff', { extraPayment: saving }, profile);
    return result.error ? null : (
      <div className="impact">
        <h3 className="impact-title">Put the {money(saving)} toward your debt</h3>
        <PayoffCard result={result} />
      </div>
    );
  }

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
