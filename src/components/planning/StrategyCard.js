import React from 'react';
import { formatCurrency, formatDuration } from '../../lib/format';

/** One payoff strategy: how long it takes, what it costs, and a bar
 *  sized relative to the slowest strategy on screen. */
const StrategyCard = ({ variant, badge, title, description, result, timelineWidth }) => (
  <div className={`strategy-card-full strategy-${variant}`}>
    <div className="strategy-badge">{badge}</div>
    <h3>{title}</h3>
    <p className="strategy-desc">{description}</p>

    <div className="strategy-main">
      <div className="strategy-time">{formatDuration(result.years, result.remainingMonths)}</div>
    </div>

    <div className="strategy-details">
      <div className="strategy-row">
        <span>Monthly Payment:</span>
        <span>{formatCurrency(result.monthlyPayment)}</span>
      </div>
      <div className="strategy-row">
        <span>Total Paid:</span>
        <span>{formatCurrency(result.totalPaid)}</span>
      </div>
      <div className="strategy-row highlight">
        <span>Total Interest:</span>
        <span>{formatCurrency(result.totalInterest)}</span>
      </div>
    </div>

    <div className="timeline-chart">
      <div className={`timeline-fill timeline-${variant}`} style={{ width: timelineWidth }}></div>
    </div>
  </div>
);

export default StrategyCard;
