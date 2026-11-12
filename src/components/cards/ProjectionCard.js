import React from 'react';
import { Info, Sprout } from 'lucide-react';
import { duration, money } from './display';

/** A project_savings result: where the balance ends up and what it is made of. */
const ProjectionCard = ({ result, className = '' }) => {
  if (!result || result.error || result.finalBalance === undefined) return null;

  const { months, initialAmount, monthlyContribution, finalBalance, totalContributed, growth, assumption } = result;
  const parts = [
    { key: 'start', label: 'Starting balance', value: initialAmount },
    { key: 'added', label: 'You add', value: totalContributed },
    { key: 'growth', label: 'Growth', value: Math.max(0, growth) },
  ];
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;

  return (
    <article className={`card tool-card projection-card ${className}`.trim()} aria-label="Savings projection">
      <header className="tool-card-head">
        <span className="eyebrow">
          <Sprout size={14} aria-hidden="true" />
          Savings projection
        </span>
        <span className="chip">{duration(months)}</span>
      </header>

      <div className="tool-card-hero">
        <span className="tool-card-label">In {duration(months).toLowerCase()} you could have</span>
        <span className="figure">{money(finalBalance)}</span>
      </div>

      <div className="stack-bar" aria-hidden="true">
        {parts.map((part) =>
          part.value > 0 ? (
            <span
              key={part.key}
              className={`stack-bar-part stack-${part.key}`}
              style={{ flexGrow: part.value / total }}
            />
          ) : null
        )}
      </div>
      <ul className="stack-legend">
        {parts.map((part) => (
          <li key={part.key}>
            <span className={`stack-dot stack-${part.key}`} aria-hidden="true" />
            <span>{part.label}</span>
            <span className="tabular">{money(part.value)}</span>
          </li>
        ))}
      </ul>

      <div className="card-rows">
        <div className="card-row">
          <span>Adding each month</span>
          <span>{money(monthlyContribution)}</span>
        </div>
      </div>

      <footer className="card-foot">
        <Info size={13} aria-hidden="true" />
        {assumption}
      </footer>
    </article>
  );
};

export default ProjectionCard;
