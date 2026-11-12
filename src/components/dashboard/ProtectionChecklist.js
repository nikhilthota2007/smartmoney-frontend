import React from 'react';
import { AlertCircle, Check, HelpCircle, ShieldCheck } from 'lucide-react';
import { STATUS } from '../../lib/protection';

const ICONS = {
  [STATUS.OK]: Check,
  [STATUS.GAP]: AlertCircle,
  [STATUS.UNKNOWN]: HelpCircle,
};

/**
 * Coverage and retirement gaps, shown alongside the score rather than folded
 * into it — see the note in src/lib/protection.js.
 */
const ProtectionChecklist = ({ checks }) => {
  if (checks.length === 0) return null;

  return (
    <section className="protection" aria-labelledby="protection-heading">
      <h3 className="sheet-section-title" id="protection-heading">
        <ShieldCheck size={15} aria-hidden="true" />
        Coverage &amp; Retirement
      </h3>
      <ul className="protection-list">
        {checks.map((check) => {
          const Icon = ICONS[check.status];
          return (
            <li className={`protection-item protection-${check.status}`} key={check.key}>
              <span className="protection-icon" aria-hidden="true">
                <Icon size={14} />
              </span>
              <div>
                <span className="protection-label">{check.label}</span>
                <span className="protection-detail">{check.detail}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default ProtectionChecklist;
