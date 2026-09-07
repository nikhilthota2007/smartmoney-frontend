import React from 'react';

/** One weighted component of the health score, with its progress bar. */
const ScoreBreakdown = ({ label, detail, component, color }) => (
  <div className="breakdown-item">
    <div className="breakdown-header">
      <span className="breakdown-label">{label}</span>
      <span className="breakdown-score">
        {component.score}/{component.max}
      </span>
    </div>
    <div className="progress-bar">
      <div
        className="progress-fill"
        style={{
          width: `${(component.score / component.max) * 100}%`,
          backgroundColor: color,
        }}
      ></div>
    </div>
    <div className="breakdown-detail">{detail}</div>
  </div>
);

export default ScoreBreakdown;
