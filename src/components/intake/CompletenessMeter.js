import React from 'react';

/** How much the advisor knows, and the one thing to add next. */
const CompletenessMeter = ({ completeness }) => (
  <div className="meter">
    <p className="meter-percent tabular">{completeness.percent}% complete</p>
    <div
      className="bar meter-bar"
      role="progressbar"
      aria-label="Profile completeness"
      aria-valuenow={completeness.percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="bar-fill bar-fill-accent" style={{ width: `${completeness.percent}%` }} />
    </div>
    {completeness.nextAction && <p className="meter-hint">{completeness.nextAction}</p>}
  </div>
);

export default CompletenessMeter;
