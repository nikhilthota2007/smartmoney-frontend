import { deriveMetrics } from './derive';

/**
 * Financial health score, 0-100, from three weighted components:
 * savings rate (40), debt-to-income (30) and emergency fund (30).
 *
 * Returns null when there is no income to score against.
 */
export const calculateHealthScore = (data) => {
  const { income, savingsRate, debtToIncomeRatio, emergencyMonths } = deriveMetrics(data);

  if (income === 0) return null;

  let savingsScore = 0;
  if (savingsRate >= 20) savingsScore = 40;
  else if (savingsRate >= 15) savingsScore = 35;
  else if (savingsRate >= 10) savingsScore = 25;
  else if (savingsRate >= 5) savingsScore = 15;
  else if (savingsRate > 0) savingsScore = 5;

  let debtScore = 0;
  if (debtToIncomeRatio === 0) debtScore = 30;
  else if (debtToIncomeRatio < 10) debtScore = 25;
  else if (debtToIncomeRatio < 20) debtScore = 20;
  else if (debtToIncomeRatio < 36) debtScore = 10;
  else debtScore = 0;

  let emergencyScore = 0;
  if (emergencyMonths >= 6) emergencyScore = 30;
  else if (emergencyMonths >= 3) emergencyScore = 20;
  else if (emergencyMonths >= 1) emergencyScore = 10;
  else if (emergencyMonths > 0) emergencyScore = 5;

  return {
    total: Math.round(savingsScore + debtScore + emergencyScore),
    savingsRate: { value: savingsRate, score: savingsScore, max: 40 },
    debtRatio: { value: debtToIncomeRatio, score: debtScore, max: 30 },
    emergencyFund: { value: emergencyMonths, score: emergencyScore, max: 30 },
  };
};

/** Map a 0-100 score onto a label, colour and icon. */
export const getScoreRating = (score) => {
  if (score >= 80) return { rating: 'Excellent', color: '#10b981', icon: '🌟' };
  if (score >= 60) return { rating: 'Good', color: '#3b82f6', icon: '✅' };
  if (score >= 40) return { rating: 'Fair', color: '#f59e0b', icon: '⚠️' };
  return { rating: 'Needs Improvement', color: '#ef4444', icon: '🚨' };
};

/** Actionable tips for whichever score components are weakest. */
export const getImprovementTips = (healthData) => {
  const tips = [];
  if (healthData.savingsRate.score < 30) {
    tips.push(`Increase your savings rate: Currently saving ${healthData.savingsRate.value.toFixed(1)}%, aim for 15-20%`);
  }
  if (healthData.debtRatio.score < 20 && healthData.debtRatio.value > 0) {
    tips.push(`Reduce debt: Current debt is ${healthData.debtRatio.value.toFixed(1)}% of annual income, target below 20%`);
  }
  if (healthData.emergencyFund.score < 20) {
    tips.push(`Build emergency fund: Currently ${healthData.emergencyFund.value.toFixed(1)} months of expenses, target 6 months`);
  }
  if (tips.length === 0) {
    tips.push('Great work! Keep maintaining these healthy financial habits.');
  }
  return tips;
};
