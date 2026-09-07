import { useCallback, useState } from 'react';
import { sendChatMessage } from '../lib/api';
import { buildAdvisorContext } from '../lib/aiContext';
import { toFinancialData } from '../lib/profile';

export const GREETING =
  "Hello! I'm your AI financial advisor. I have your financial information and I'm here to help you save money and achieve your goals. What would you like to know?";

const greetingMessage = () => ({ role: 'assistant', content: GREETING });

/**
 * Conversation state and the request cycle.
 *
 * The financial context is rebuilt on every send rather than held in state, so
 * a figure the user edits mid-conversation is reflected in the very next answer.
 */
export const useChat = (profile) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const startConversation = useCallback(() => {
    setMessages([greetingMessage()]);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([greetingMessage()]);
    setInput('');
  }, []);

  const sendMessage = useCallback(
    async (messageText = null) => {
      const textToSend = messageText || input;
      if (!textToSend.trim() || loading) return;

      // The request carries the history as it stood before this turn.
      const history = messages;
      setMessages((prev) => [...prev, { role: 'user', content: textToSend }]);
      setInput('');
      setLoading(true);

      try {
        const reply = await sendChatMessage({
          financialData: toFinancialData(profile),
          financialContext: buildAdvisorContext(profile),
          message: textToSend,
          history,
        });
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Sorry, I encountered an error: ${error.message}. Please make sure the Java backend is running on port 8080.`,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [profile, input, loading, messages]
  );

  return { messages, input, setInput, loading, sendMessage, clearChat, startConversation };
};
