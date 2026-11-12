import React from 'react';
import { Activity, AlertTriangle, ArrowRight, Check, Sparkles } from 'lucide-react';
import Sheet from '../common/Sheet';
import ScoreDial from '../cards/ScoreDial';
import ScoreBreakdown from './ScoreBreakdown';
import ProtectionChecklist from './ProtectionChecklist';
import { RATING_TONE } from '../cards/display';
import { calculateHealthScore, getScoreRating, getImprovementTips } from '../../lib/healthScore';
import { getProtectionChecks } from '../../lib/protection';
import { useProfile } from '../../context/ProfileContext';

const RATING_ICON = { success: Check, warning: AlertTriangle, danger: AlertTriangle };

/** The health score sheet: the dial, its three parts, coverage, and next moves. */
const HealthScoreModal = ({ onClose, onAddFigures }) => {
  const { profile, financialData } = useProfile();
  const healthScore = calculateHealthScore(financialData);
  const rating = healthScore ? getScoreRating(healthScore.total).rating : null;
  // The library's rating colours are hex values; the UI uses theme tokens.
  const tone = rating ? RATING_TONE[rating] : null;
  const RatingIcon = tone ? RATING_ICON[tone] : Check;
  const improvementTips = healthScore ? getImprovementTips(healthScore) : [];
  const protectionChecks = getProtectionChecks(profile);

  return (
    <Sheet onClose={onClose} labelledBy="health-title">
      <header className="sheet-head">
        <span className="eyebrow">
          <Activity size={14} aria-hidden="true" />
          Financial health
        </span>
        <h2 className="sheet-title" id="health-title">
          Your Financial Health Score
        </h2>
      </header>

      {healthScore ? (
        <div className="sheet-body">
          <div className="health-hero">
            <ScoreDial score={healthScore.total} tone={`var(--color-${tone})`} />
            <div className="health-verdict">
              <span className={`chip chip-${tone}`}>
                <RatingIcon size={13} aria-hidden="true" />
                {rating}
              </span>
              <p className="health-note">
                A starting point, not a grade. Each part below has one move that would raise it, and none of them
                needs to happen this week.
              </p>
            </div>
          </div>

          <div className="card card-flat health-breakdown">
            <ScoreBreakdown
              label="Savings rate"
              component={healthScore.savingsRate}
              detail={`${healthScore.savingsRate.value.toFixed(1)}% of income`}
              color={`var(--color-${tone})`}
            />
            <ScoreBreakdown
              label="Debt-to-income"
              component={healthScore.debtRatio}
              detail={`${healthScore.debtRatio.value.toFixed(1)}% of annual income`}
              color={`var(--color-${tone})`}
            />
            <ScoreBreakdown
              label="Emergency fund"
              component={healthScore.emergencyFund}
              detail={`${healthScore.emergencyFund.value.toFixed(1)} months saved`}
              color={`var(--color-${tone})`}
            />
          </div>

          <ProtectionChecklist checks={protectionChecks} />

          <section className="health-tips" aria-labelledby="tips-heading">
            <h3 className="sheet-section-title" id="tips-heading">
              <Sparkles size={15} aria-hidden="true" />
              How to improve
            </h3>
            <ul>
              {improvementTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <div className="sheet-body sheet-empty">
          <p>Enter your financial information to see your health score</p>
          {onAddFigures && (
            <button className="btn btn-primary" onClick={onAddFigures}>
              Add my numbers
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
};

export default HealthScoreModal;
