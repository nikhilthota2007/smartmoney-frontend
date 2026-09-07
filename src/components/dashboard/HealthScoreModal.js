import React from 'react';
import { Activity } from 'lucide-react';
import Modal from '../common/Modal';
import ScoreBreakdown from './ScoreBreakdown';
import ProtectionChecklist from './ProtectionChecklist';
import { calculateHealthScore, getScoreRating, getImprovementTips } from '../../lib/healthScore';
import { getProtectionChecks } from '../../lib/protection';
import { useProfile } from '../../context/ProfileContext';

const HealthScoreModal = ({ onClose }) => {
  const { profile, financialData } = useProfile();
  const healthScore = calculateHealthScore(financialData);
  const scoreRating = healthScore ? getScoreRating(healthScore.total) : null;
  const improvementTips = healthScore ? getImprovementTips(healthScore) : [];
  const protectionChecks = getProtectionChecks(profile);

  return (
    <Modal onClose={onClose}>
      <div className="health-score-card">
        <div className="health-header">
          <Activity size={24} />
          <h2>Your Financial Health Score</h2>
        </div>

        {healthScore ? (
          <>
            <div className="score-circle" style={{ borderColor: scoreRating.color }}>
              <div className="score-number" style={{ color: scoreRating.color }}>
                {healthScore.total}
              </div>
              <div className="score-label">out of 100</div>
            </div>

            <div className="score-rating" style={{ color: scoreRating.color }}>
              <span className="rating-icon">{scoreRating.icon}</span>
              <span className="rating-text">{scoreRating.rating}</span>
            </div>

            <div className="encouragement-message">
              <p>
                Don't worry if your financial health isn't where you want it to be right now. We can
                work on it together! Every small step toward better financial habits makes a
                difference.
              </p>
            </div>

            <div className="score-breakdown">
              <ScoreBreakdown
                label="Savings Rate"
                component={healthScore.savingsRate}
                detail={`${healthScore.savingsRate.value.toFixed(1)}% of income`}
                color={scoreRating.color}
              />
              <ScoreBreakdown
                label="Debt-to-Income"
                component={healthScore.debtRatio}
                detail={`${healthScore.debtRatio.value.toFixed(1)}% of annual income`}
                color={scoreRating.color}
              />
              <ScoreBreakdown
                label="Emergency Fund"
                component={healthScore.emergencyFund}
                detail={`${healthScore.emergencyFund.value.toFixed(1)} months saved`}
                color={scoreRating.color}
              />
            </div>

            <ProtectionChecklist checks={protectionChecks} />

            <div className="improvement-tips">
              <h3>How to Improve</h3>
              {improvementTips.map((tip, idx) => (
                <div key={idx} className="tip-item">
                  <span className="tip-bullet">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="no-score">
            <p>Enter your financial information to see your health score</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default HealthScoreModal;
