import { useCallback, useState } from 'react';
import { sendChatMessage } from '../lib/api';

export const GREETING =
  "Hello! I'm your AI financial advisor. I have your financial information and I'm here to help you save money and achieve your goals. What would you like to know?";

const greetingMessage = () => ({ role: 'assistant', content: GREETING });

/**
 * Conversation state and the request cycle.
 * Phase 2 replaces the single fetch with a streaming, tool-calling exchange.
 */
export const useChat = (financialData) => {
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
        const reply = await sendChatMessage({ financialData, message: textToSend, history });
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
    [financialData, input, loading, messages]
  );

  return { messages, input, setInput, loading, sendMessage, clearChat, startConversation };
};
