import React, { createContext, useContext, useMemo } from 'react';
import { useChat } from '../hooks/useChat';
import { useProfile } from '../context/ProfileContext';
import { useStatement } from './StatementContext';
import { statementBrief } from '../lib/statement/brief';
import { debtPlan } from '../lib/statement/plan';

/**
 * Holds the conversation above the screens, so leaving the advisor (for the
 * wizard, or the landing page) and coming back keeps what has been said and
 * any half-typed question.
 */
const ChatSessionContext = createContext(null);

export const ChatSessionProvider = ({ children }) => {
  const { profile } = useProfile();
  const { analysis } = useStatement();
  // What the page shows about the statement, so the advisor can talk about
  // the same subscriptions, fixes and plan instead of asking for them.
  const extraContext = useMemo(
    () => (analysis ? { statement: statementBrief(analysis, debtPlan(profile, analysis.monthlySaving)) } : null),
    [analysis, profile]
  );
  const chat = useChat(profile, { extraContext });
  return <ChatSessionContext.Provider value={chat}>{children}</ChatSessionContext.Provider>;
};

export const useChatSession = () => {
  const context = useContext(ChatSessionContext);
  if (!context) throw new Error('useChatSession must be used inside a ChatSessionProvider');
  return context;
};

/**
 * Greet only on a fresh conversation: coming back from editing finances must
 * not discard what has already been said.
 */
export const openConversation = (chat) => {
  if (chat.messages.length === 0) chat.startConversation();
};
