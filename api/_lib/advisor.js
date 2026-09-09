/**
 * Talks to Groq's OpenAI-compatible chat completions API.
 * A port of AdvisorService.java.
 *
 * The model may answer, or ask for a calculation. Tool calls are relayed to the
 * client rather than executed here — see tools.js for why.
 */
const { buildSystemPrompt } = require('./prompt.js');
const { renderFinancialPicture } = require('./picture.js');
const { TOOL_DECLARATIONS } = require('./tools.js');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Groq retired llama-3.3-70b-versatile, and the only symptom was the generic
 * "temporarily unavailable" error: a retired model 404s on every call, and the
 * browser cannot tell that apart from an outage. Overridable through the
 * environment so the next retirement is a variable, not a deploy.
 */
const DEFAULT_MODEL = 'openai/gpt-oss-120b';

const modelName = () => process.env.GROQ_MODEL || DEFAULT_MODEL;

const temperature = () => Number(process.env.GROQ_TEMPERATURE ?? 0.7);
const maxTokens = () => Number(process.env.GROQ_MAX_TOKENS ?? 3000);

/** Without this a stalled Groq call runs until the platform kills the function. */
const REQUEST_TIMEOUT_MS = () => Number(process.env.GROQ_TIMEOUT_MS ?? 60000);

/**
 * AbortSignal.timeout exists on the Vercel runtime but not in the jsdom the
 * test suite runs under, and an absent timeout beats a module that will not
 * import.
 */
const timeoutSignal = (ms) =>
  typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(ms)
    : undefined;

/**
 * Raised when Groq itself rejects the call. Carries the status and body so the
 * log says which of a retired model, a bad key or a rate limit it was — a
 * distinction the browser never sees, because all three show the user the same
 * generic error.
 */
class GroqError extends Error {
  constructor(status, body) {
    super(`Groq rejected the request: status=${status}`);
    this.name = 'GroqError';
    this.status = status;
    this.body = body;
  }
}

const textMessage = (role, content) => ({ role, content });

const toWireFormat = (call) => ({
  id: call.id,
  type: 'function',
  function: {
    name: call.name,
    arguments: call.arguments ?? '{}',
  },
});

const fromHistory = (message) => {
  if (message.role === 'tool') {
    return {
      role: 'tool',
      tool_call_id: message.toolCallId,
      content: message.content ?? '',
    };
  }

  // The frontend has used both 'model' and 'assistant' over time.
  const role = message.role === 'model' ? 'assistant' : message.role;
  const turn = textMessage(role, message.content ?? '');

  if (Array.isArray(message.toolCalls) && message.toolCalls.length > 0) {
    turn.tool_calls = message.toolCalls.map(toWireFormat);
  }
  return turn;
};

const buildMessages = ({ financialData, financialContext, message, history }) => {
  const messages = [
    textMessage('system', buildSystemPrompt(renderFinancialPicture(financialContext, financialData))),
  ];

  if (Array.isArray(history)) {
    history.forEach((turn) => messages.push(fromHistory(turn)));
  }

  // Absent on a continuation: the question is already in the history, and what
  // follows is the tool results the model is waiting on.
  if (typeof message === 'string' && message.trim() !== '') {
    messages.push(textMessage('user', message));
  }
  return messages;
};

const parseToolCalls = (raw) => {
  if (!Array.isArray(raw)) return [];

  const calls = [];
  for (const call of raw) {
    if (!call || typeof call !== 'object') continue;
    const fn = call.function;
    if (!fn || typeof fn !== 'object') continue;
    if (typeof fn.name !== 'string') continue;

    calls.push({
      id: typeof call.id === 'string' ? call.id : fn.name,
      name: fn.name,
      arguments: typeof fn.arguments === 'string' ? fn.arguments : '{}',
    });
  }
  return calls;
};

const extractReply = (response) => {
  const choices = response && response.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error('Groq response contained no choices');
  }
  const message = choices[0] && choices[0].message;
  if (!message || typeof message !== 'object') {
    throw new Error('Groq response was not in the expected shape');
  }

  const content = typeof message.content === 'string' ? message.content : null;
  const toolCalls = parseToolCalls(message.tool_calls);

  if (content === null && toolCalls.length === 0) {
    throw new Error('Groq returned neither content nor tool calls');
  }
  return { content, toolCalls };
};

/**
 * Ask the model. Resolves to `{ content, toolCalls }`: either the assistant's
 * text, or the calculations it wants run.
 */
const getChatResponse = async (request, options = {}) => {
  const fetchImpl = options.fetchImpl || ((...args) => fetch(...args));
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Distinct from an upstream failure: nothing was ever sent.
    throw new Error('GROQ_API_KEY is not set on this deployment');
  }

  const body = {
    model: modelName(),
    messages: buildMessages(request),
    temperature: temperature(),
    max_tokens: maxTokens(),
    tools: TOOL_DECLARATIONS,
    tool_choice: 'auto',
  };

  const response = await fetchImpl(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: timeoutSignal(REQUEST_TIMEOUT_MS()),
  });

  if (!response.ok) {
    throw new GroqError(response.status, await response.text());
  }

  return extractReply(await response.json());
};

module.exports = {
  DEFAULT_MODEL,
  GroqError,
  buildMessages,
  extractReply,
  getChatResponse,
  modelName,
};
