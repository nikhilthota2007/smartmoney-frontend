import { useCallback, useState } from 'react';
import { sendChatMessage } from '../lib/api';
import { buildAdvisorContext } from '../lib/aiContext';
import { toFinancialData } from '../lib/profile';
import { executeTool } from '../lib/tools';

export const GREETING =
  "Hello! I'm your AI financial advisor. I have your financial information and I'm here to help you save money and achieve your goals. What would you like to know?";

/**
 * How many times we will run tools and go back to the model for one question.
 * The backend is stateless, so this is the only bound on the loop.
 */
export const MAX_TOOL_ROUNDS = 3;

const greetingMessage = () => ({ role: 'assistant', content: GREETING });

/** Turns the model needs to see again but the user should never be shown. */
const isInternalTurn = (message) => message.role === 'tool' || Boolean(message.toolCalls);

export const visibleMessages = (messages) => messages.filter((message) => !isInternalTurn(message));

/**
 * Conversation state and the request cycle.
 *
 * A turn can take several round trips: the model asks for a calculation, we run
 * it here against src/lib/, and send the result back for it to explain. Those
 * intermediate turns stay in the transcript — the model needs them on the next
 * request, since the backend keeps no state — but are not rendered.
 *
 * The financial context is rebuilt on every send rather than held in state, so
 * a figure the user edits mid-conversation is reflected in the very next answer.
 */
export const useChat = (profile) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [runningTool, setRunningTool] = useState(null);

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

      const userMessage = { role: 'user', content: textToSend };
      setMessages((previous) => [...previous, userMessage]);
      setInput('');
      setLoading(true);

      // Built up locally: state updates are async, and each round trip needs the
      // full transcript including the turns added by the previous one.
      let history = [...messages, userMessage];
      const request = {
        financialData: toFinancialData(profile),
        financialContext: buildAdvisorContext(profile),
      };

      try {
        for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
          // After the first pass the question is already in the history.
          const reply = await sendChatMessage({
            ...request,
            message: round === 0 ? textToSend : null,
            history: round === 0 ? messages : history,
          });

          if (!reply.toolCalls?.length) {
            setMessages((previous) => [...previous, { role: 'assistant', content: reply.response }]);
            return;
          }

          if (round === MAX_TOOL_ROUNDS) {
            throw new Error('the advisor kept asking for calculations without answering');
          }

          const assistantTurn = { role: 'assistant', content: reply.response || '', toolCalls: reply.toolCalls };
          const toolTurns = reply.toolCalls.map((call) => {
            setRunningTool(call.name);
            return {
              role: 'tool',
              toolCallId: call.id,
              name: call.name,
              content: JSON.stringify(executeTool(call.name, call.arguments, profile)),
            };
          });

          history = [...history, assistantTurn, ...toolTurns];
          setMessages((previous) => [...previous, assistantTurn, ...toolTurns]);
        }
      } catch (error) {
        setMessages((previous) => [
          ...previous,
          {
            role: 'assistant',
            content: `Sorry, I encountered an error: ${error.message}. Please make sure the Java backend is running on port 8080.`,
          },
        ]);
      } finally {
        setRunningTool(null);
        setLoading(false);
      }
    },
    [profile, input, loading, messages]
  );

  return {
    messages,
    visible: visibleMessages(messages),
    input,
    setInput,
    loading,
    runningTool,
    sendMessage,
    clearChat,
    startConversation,
  };
};
