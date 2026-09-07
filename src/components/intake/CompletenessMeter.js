import React from 'react';
import { Check } from 'lucide-react';

const CompletenessMeter = ({ completeness }) => (
  <div className="completeness">
    <div className="completeness-header">
      <span className="completeness-percent">{completeness.percent}% complete</span>
      {completeness.nextAction && <span className="completeness-hint">{completeness.nextAction}</span>}
    </div>

    <div
      className="progress-bar"
      role="progressbar"
      aria-label="Profile completeness"
      aria-valuenow={completeness.percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress-fill completeness-fill" style={{ width: `${completeness.percent}%` }}></div>
    </div>

    <ul className="completeness-sections">
      {completeness.sections.map((section) => (
        <li key={section.key} className={section.complete ? 'section-done' : 'section-todo'}>
          {section.complete && <Check size={14} />}
          {section.label}
        </li>
      ))}
    </ul>
  </div>
);

export default CompletenessMeter;
