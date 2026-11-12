import React, { createContext, useContext } from 'react';
import { useChat } from '../hooks/useChat';
import { useProfile } from '../context/ProfileContext';

/**
 * Holds the conversation above the screens, so leaving the advisor (for the
 * wizard, or the landing page) and coming back keeps what has been said and
 * any half-typed question.
 */
const ChatSessionContext = createContext(null);

export const ChatSessionProvider = ({ children }) => {
  const { profile } = useProfile();
  const chat = useChat(profile);
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
