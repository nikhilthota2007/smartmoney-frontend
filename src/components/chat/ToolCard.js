import React from 'react';
import PayoffCard from '../cards/PayoffCard';
import GoalCard from '../cards/GoalCard';
import ProjectionCard from '../cards/ProjectionCard';
import { useProfile } from '../../context/ProfileContext';
import { findUnpayableDebts } from '../../lib/planner/debtWarnings';

const CARDS = {
  simulate_debt_payoff: PayoffCard,
  evaluate_goal: GoalCard,
  project_savings: ProjectionCard,
};

/** The card for one tool result in the thread. */
const ToolCard = ({ tool, result }) => {
  const { debts } = useProfile();
  const Card = CARDS[tool];
  if (!Card) return null;
  return tool === 'simulate_debt_payoff' ? (
    <Card result={result} unpayable={findUnpayableDebts(debts)} />
  ) : (
    <Card result={result} />
  );
};

export default ToolCard;
