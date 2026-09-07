import React from 'react';
import { AlertCircle, Check, HelpCircle } from 'lucide-react';
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
    <section className="protection-checklist" aria-labelledby="protection-heading">
      <h3 id="protection-heading">Coverage &amp; Retirement</h3>
      {checks.map((check) => {
        const Icon = ICONS[check.status];
        return (
          <div className={`protection-item protection-${check.status}`} key={check.key}>
            <Icon size={16} />
            <div>
              <span className="protection-label">{check.label}</span>
              <span className="protection-detail">{check.detail}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default ProtectionChecklist;
