import React from 'react';

/** One weighted component of the health score, with its bar. */
const ScoreBreakdown = ({ label, detail, component, color }) => (
  <div className="breakdown">
    <div className="breakdown-head">
      <span className="breakdown-label">{label}</span>
      <span className="breakdown-score tabular">
        {component.score}/{component.max}
      </span>
    </div>
    <div className="bar" aria-hidden="true">
      <div
        className="bar-fill bar-grow"
        style={{ width: `${(component.score / component.max) * 100}%`, background: color }}
      />
    </div>
    <div className="breakdown-detail">{detail}</div>
  </div>
);

export default ScoreBreakdown;
