import React from 'react';
import { Mountain, Snowflake, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../lib/format';
import { duration } from '../cards/display';

const ICONS = { avalanche: Mountain, snowball: Snowflake, recommended: Sparkles };

/** One payoff strategy: how long it takes, what it costs, and a bar
 *  sized relative to the slowest strategy on screen. */
const StrategyCard = ({ variant, badge, title, description, result, timelineWidth }) => {
  const Icon = ICONS[variant] || Sparkles;

  return (
    <article className={`card strategy-card strategy-${variant}`}>
      <header className="tool-card-head">
        <span className={`chip${variant === 'recommended' ? ' chip-accent' : ''}`}>
          <Icon size={13} aria-hidden="true" />
          {badge}
        </span>
      </header>

      <div>
        <h3 className="strategy-title">{title}</h3>
        <p className="strategy-desc">{description}</p>
      </div>

      <div className="tool-card-hero">
        <span className="tool-card-label">Debt-free in</span>
        <span className="figure strategy-time">{duration(result.months)}</span>
      </div>

      <div className="bar" aria-hidden="true">
        <div
          className={`bar-fill bar-grow${variant === 'recommended' ? ' bar-fill-accent' : ''}`}
          style={{ width: timelineWidth }}
        />
      </div>

      <div className="card-rows">
        <div className="card-row">
          <span>Monthly payment</span>
          <span>{formatCurrency(result.monthlyPayment)}</span>
        </div>
        <div className="card-row">
          <span>Total paid</span>
          <span>{formatCurrency(result.totalPaid)}</span>
        </div>
        <div className="card-row card-row-strong">
          <span>Total interest</span>
          <span>{formatCurrency(result.totalInterest)}</span>
        </div>
      </div>
    </article>
  );
};

export default StrategyCard;
