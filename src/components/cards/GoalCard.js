import React from 'react';
import { AlertTriangle, Calculator, Check, Target, TrendingUp } from 'lucide-react';
import { money, monthLabel, duration } from './display';
import { goalVerdict } from './verdict';

const VERDICT_ICON = { done: Check, onTrack: Check, stretch: TrendingUp, offTrack: AlertTriangle };

/** An evaluate_goal result: what the goal needs each month, and whether that fits. */
const GoalCard = ({ result, today = new Date(), className = '' }) => {
  const verdict = goalVerdict(result);
  if (!verdict) return null;

  const {
    goalName, targetAmount, alreadySaved, monthsUntilTarget, requiredMonthly,
    monthlySurplus, shortfallPerMonth, monthsAtCurrentSurplus, beyondHorizon,
  } = result;
  const hasDeadline = monthsUntilTarget !== null && monthsUntilTarget !== undefined;
  const progress = targetAmount > 0 ? Math.min(1, alreadySaved / targetAmount) : 0;
  const Icon = VERDICT_ICON[verdict.key];

  return (
    <article className={`card tool-card goal-card ${className}`.trim()} aria-label="Goal check">
      <header className="tool-card-head">
        <span className="eyebrow">
          <Target size={14} aria-hidden="true" />
          {goalName || 'Goal check'}
        </span>
        <span className={`chip chip-${verdict.tone}`}>
          <Icon size={13} aria-hidden="true" />
          {verdict.label}
        </span>
      </header>

      <div className="tool-card-hero">
        <span className="figure">{money(targetAmount)}</span>
        {hasDeadline && <span className="tool-card-label">by {monthLabel(monthsUntilTarget, today)}</span>}
      </div>

      <div className="goal-progress">
        <div className="bar" aria-hidden="true">
          <div className="bar-fill bar-grow" style={{ width: `${Math.max(progress > 0 ? 3 : 0, progress * 100)}%` }} />
        </div>
        <span className="goal-progress-label tabular">
          {money(alreadySaved)} saved of {money(targetAmount)}
        </span>
      </div>

      <div className="card-rows">
        {requiredMonthly !== null && requiredMonthly !== undefined && (
          <div className="card-row">
            <span>Needed each month</span>
            <span>{money(requiredMonthly)}</span>
          </div>
        )}
        <div className="card-row">
          <span>Free each month</span>
          <span>{money(monthlySurplus)}</span>
        </div>
        {shortfallPerMonth > 0 && (
          <div className="card-row">
            <span>Short by</span>
            <span>{money(shortfallPerMonth)}/mo</span>
          </div>
        )}
        {monthsAtCurrentSurplus > 0 && (
          <div className="card-row">
            <span>At your current pace</span>
            <span>{duration(monthsAtCurrentSurplus)}</span>
          </div>
        )}
        {beyondHorizon && (
          <div className="card-row">
            <span>At your current pace</span>
            <span>Over 50 years</span>
          </div>
        )}
      </div>

      <footer className="card-foot">
        <Calculator size={13} aria-hidden="true" />
        Calculated from your numbers
      </footer>
    </article>
  );
};

export default GoalCard;
