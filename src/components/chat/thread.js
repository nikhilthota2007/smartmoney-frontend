/**
 * Turn the chat transcript into what the thread shows.
 *
 * The transcript keeps every round trip: the user's question, the model's
 * request to run a tool, the tool's result, and the model's answer. Today
 * only questions and answers are shown. The tool results are real
 * calculations, so the thread also shows each one as a card, between the
 * question and the explanation of it.
 *
 * Presentation only: nothing here changes what useChat stores or sends.
 */

/** Tools whose results have a card. */
export const CARD_TOOLS = ['simulate_debt_payoff', 'evaluate_goal', 'project_savings'];

/** useChat's wording for a failed request (src/hooks/useChat.js). */
const ERROR_PREFIX = 'Sorry, I encountered an error';

const parseResult = (content) => {
  try {
    const result = JSON.parse(content);
    return result && typeof result === 'object' ? result : null;
  } catch {
    return null;
  }
};

/**
 * Items in display order. `key` is the transcript index, which is stable for
 * the life of a conversation.
 */
export const buildThread = (messages) => {
  const items = [];

  messages.forEach((message, index) => {
    if (message.role === 'user') {
      items.push({ kind: 'user', key: index, text: message.content });
      return;
    }

    if (message.role === 'tool') {
      const result = parseResult(message.content);
      // A failed call gets no card; the advisor's answer explains it.
      if (result && !result.error && CARD_TOOLS.includes(message.name)) {
        items.push({ kind: 'card', key: index, tool: message.name, result });
      }
      return;
    }

    // An assistant turn that only requested tools is internal.
    if (message.role === 'assistant' && !message.toolCalls) {
      const text = message.content || '';
      items.push({ kind: message.error || text.startsWith(ERROR_PREFIX) ? 'error' : 'advisor', key: index, text });
    }
  });

  return items;
};

/** Short replies reveal word by word; long ones arrive as a block. */
export const WORD_REVEAL_LIMIT = 60;

export const wordCount = (text) => text.split(/\s+/).filter(Boolean).length;
