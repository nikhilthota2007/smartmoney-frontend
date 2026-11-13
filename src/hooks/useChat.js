import { useCallback, useState } from 'react';
import { sendChatMessage } from '../lib/api';
import { buildAdvisorContext } from '../lib/aiContext';
import { toFinancialData } from '../lib/profile';
import { executeTool } from '../lib/tools';

export const GREETING =
  "Hey. I've got your numbers in front of me, and nothing in them scares me. Ask me anything: debt, savings, whether you can afford the thing. I'll run the math and tell you straight.";

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
 * `extraContext`, when given, is merged into it (the statement brief).
 */
export const useChat = (profile, { extraContext = null } = {}) => {
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
        // extraContext adds derived sections the profile alone cannot give
        // (the latest statement's analysis); the profile's context is unchanged.
        financialContext: extraContext ? { ...buildAdvisorContext(profile), ...extraContext } : buildAdvisorContext(profile),
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
            // A message the server wrote for the user already says what to do;
            // wrapping it again repeated "Please try again in a moment" twice.
            content: error.userFacing
              ? error.message
              : `Sorry, I encountered an error: ${error.message}. Please try again in a moment.`,
            error: true,
          },
        ]);
      } finally {
        setRunningTool(null);
        setLoading(false);
      }
    },
    [profile, input, loading, messages, extraContext]
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
