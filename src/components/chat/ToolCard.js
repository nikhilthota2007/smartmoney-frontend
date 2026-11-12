import React from 'react';
import PayoffCard from '../cards/PayoffCard';
import GoalCard from '../cards/GoalCard';
import ProjectionCard from '../cards/ProjectionCard';

const CARDS = {
  simulate_debt_payoff: PayoffCard,
  evaluate_goal: GoalCard,
  project_savings: ProjectionCard,
};

/** The card for one tool result in the thread. */
const ToolCard = ({ tool, result }) => {
  const Card = CARDS[tool];
  return Card ? <Card result={result} /> : null;
};

export default ToolCard;
