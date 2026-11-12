/**
 * Google Gemini, used when the user has pasted their own API key.
 *
 * The key arrives per request in a header and is used for that request only:
 * it is never stored, logged or returned. Everything else about a chat stays
 * the same as the Groq path: the same system prompt and financial picture, the
 * same tool declarations, and tool calls relayed to the browser to run.
 *
 * Gemini differs from the OpenAI wire format Groq uses in three ways that
 * matter here:
 *   - the conversation is `contents` with roles user/model, and the system
 *     prompt is a separate `systemInstruction`;
 *   - a tool call is a `functionCall` part, and its result goes back as a
 *     `functionResponse` part in a user turn;
 *   - newer models attach an opaque `thoughtSignature` to function calls,
 *     which must be sent back unchanged on the next request. It rides along
 *     on the tool call object the browser already stores and returns.
 */
const { buildSystemPrompt } = require('./prompt.js');
const { renderFinancialPicture } = require('./picture.js');
const { TOOL_DECLARATIONS } = require('./tools.js');

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta';

/** Used only if model discovery fails; GEMINI_MODEL overrides both. */
const FALLBACK_MODEL = 'gemini-2.5-flash';

const timeoutMs = () => Number(process.env.GEMINI_TIMEOUT_MS ?? 60000);
const timeoutSignal = (ms) =>
  typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(ms)
    : undefined;

class GeminiError extends Error {
  constructor(status, body) {
    super(`Gemini rejected the request: status=${status}`);
    this.name = 'GeminiError';
    this.status = status;
    this.body = body;
  }
}

/** Model names come from the client; only well-formed ones are used in a URL. */
const safeModel = (name) => {
  const model = String(name || '').replace(/^models\//, '');
  return /^[a-z0-9][a-z0-9.-]{2,60}$/.test(model) ? model : null;
};

const versionOf = (name) => {
  const match = /gemini-(\d+(?:\.\d+)?)/.exec(name);
  return match ? Number(match[1]) : 0;
};

/**
 * The newest stable Flash model this key can call. Model names change too
 * often to hard-code (and differ by account), so they are discovered.
 */
const pickModel = (models) => {
  const usable = (models || [])
    .filter((model) => (model.supportedGenerationMethods || []).includes('generateContent'))
    .map((model) => String(model.name || '').replace(/^models\//, ''))
    .filter((name) => /^gemini-[\d.]+-flash/.test(name))
    .filter((name) => !/(lite|image|tts|audio|live|thinking|embedding|8b|native|computer|robotics)/.test(name));
  const stable = usable.filter((name) => !/(preview|exp|latest)/.test(name));
  const pool = stable.length ? stable : usable;
  pool.sort((a, b) => versionOf(b) - versionOf(a) || a.length - b.length);
  return pool[0] || null;
};

const call = async (fetchImpl, url, key, body) => {
  const response = await fetchImpl(url, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: body ? JSON.stringify(body) : undefined,
    signal: timeoutSignal(timeoutMs()),
  });
  if (!response.ok) {
    throw new GeminiError(response.status, await response.text());
  }
  return response.json();
};

/** Check a key by listing its models, and choose the model to use with it. */
const checkKey = async (key, { fetchImpl = (...args) => fetch(...args) } = {}) => {
  const listing = await call(fetchImpl, `${API_ROOT}/models?pageSize=200`, key);
  return { model: safeModel(process.env.GEMINI_MODEL) || pickModel(listing.models) || FALLBACK_MODEL };
};

/** Gemini accepts an OpenAPI subset for parameters; keep only what it reads. */
const KEEP = ['type', 'description', 'enum', 'properties', 'required', 'items', 'format', 'nullable', 'minimum', 'maximum'];
const sanitizeSchema = (schema) => {
  if (!schema || typeof schema !== 'object') return schema;
  const out = {};
  KEEP.forEach((key) => {
    if (schema[key] === undefined) return;
    if (key === 'properties') {
      out.properties = Object.fromEntries(Object.entries(schema.properties).map(([name, value]) => [name, sanitizeSchema(value)]));
    } else if (key === 'items') {
      out.items = sanitizeSchema(schema.items);
    } else if (key === 'type' && Array.isArray(schema.type)) {
      out.type = schema.type.find((type) => type !== 'null');
      if (schema.type.includes('null')) out.nullable = true;
    } else {
      out[key] = schema[key];
    }
  });
  return out;
};

const FUNCTION_DECLARATIONS = TOOL_DECLARATIONS.map((tool) => ({
  name: tool.function.name,
  description: tool.function.description,
  parameters: sanitizeSchema(tool.function.parameters),
}));

const parseArgs = (raw) => {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const toResponseObject = (content) => {
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : { result: parsed };
  } catch {
    return { result: String(content ?? '') };
  }
};

/**
 * The browser's transcript as Gemini `contents`. Consecutive turns with the
 * same role are merged (parallel tool results must share one user turn), and
 * leading model turns (the canned greeting) are dropped: a conversation sent
 * to Gemini starts with the user.
 */
const toContents = (history, message) => {
  const contents = [];
  const push = (role, parts) => {
    if (!parts.length) return;
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts.push(...parts);
    else contents.push({ role, parts });
  };

  (Array.isArray(history) ? history : []).forEach((turn) => {
    if (!turn || typeof turn !== 'object') return;
    if (turn.role === 'tool') {
      const part = { functionResponse: { name: turn.name || 'tool', response: toResponseObject(turn.content) } };
      if (turn.geminiId) part.functionResponse.id = turn.geminiId;
      push('user', [part]);
      return;
    }
    if (turn.role === 'user') {
      push('user', turn.content ? [{ text: String(turn.content) }] : []);
      return;
    }
    // assistant / model
    const parts = [];
    if (turn.content) parts.push({ text: String(turn.content) });
    (Array.isArray(turn.toolCalls) ? turn.toolCalls : []).forEach((toolCall) => {
      const part = { functionCall: { name: toolCall.name, args: parseArgs(toolCall.arguments) } };
      if (toolCall.geminiId) part.functionCall.id = toolCall.geminiId;
      if (toolCall.thoughtSignature) part.thoughtSignature = toolCall.thoughtSignature;
      parts.push(part);
    });
    push('model', parts);
  });

  if (typeof message === 'string' && message.trim() !== '') {
    push('user', [{ text: message }]);
  }

  while (contents.length && contents[0].role === 'model') contents.shift();
  return contents;
};

/** Pair each tool result with its call's Gemini id, so it can be echoed back. */
const linkToolResults = (history) => {
  const idByCall = {};
  (Array.isArray(history) ? history : []).forEach((turn) => {
    (turn && Array.isArray(turn.toolCalls) ? turn.toolCalls : []).forEach((toolCall) => {
      if (toolCall.geminiId) idByCall[toolCall.id] = toolCall.geminiId;
    });
  });
  return (Array.isArray(history) ? history : []).map((turn) =>
    turn && turn.role === 'tool' && idByCall[turn.toolCallId] ? { ...turn, geminiId: idByCall[turn.toolCallId] } : turn
  );
};

const buildRequest = ({ financialData, financialContext, message, history }) => ({
  systemInstruction: { parts: [{ text: buildSystemPrompt(renderFinancialPicture(financialContext, financialData)) }] },
  contents: toContents(linkToolResults(history), message),
  tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
  generationConfig: {
    temperature: Number(process.env.GEMINI_TEMPERATURE ?? 0.7),
    maxOutputTokens: Number(process.env.GEMINI_MAX_TOKENS ?? 8192),
  },
});

/** Gemini's reply in the shape the client already handles: { content, toolCalls }. */
const extractReply = (response) => {
  const candidate = response && Array.isArray(response.candidates) ? response.candidates[0] : null;
  if (!candidate) {
    const reason = response && response.promptFeedback && response.promptFeedback.blockReason;
    throw new Error(`Gemini returned no candidates${reason ? ` (blocked: ${reason})` : ''}`);
  }
  const parts = (candidate.content && candidate.content.parts) || [];
  const text = parts.filter((part) => typeof part.text === 'string' && !part.thought).map((part) => part.text).join('');

  const stamp = Date.now().toString(36);
  const toolCalls = parts
    .filter((part) => part.functionCall && typeof part.functionCall.name === 'string')
    .map((part, index) => {
      const toolCall = {
        id: part.functionCall.id || `gemini-${stamp}-${index}`,
        name: part.functionCall.name,
        arguments: JSON.stringify(part.functionCall.args || {}),
      };
      if (part.functionCall.id) toolCall.geminiId = part.functionCall.id;
      if (part.thoughtSignature) toolCall.thoughtSignature = part.thoughtSignature;
      return toolCall;
    });

  if (!text && toolCalls.length === 0) {
    throw new Error(`Gemini returned neither text nor tool calls (finishReason: ${candidate.finishReason || 'unknown'})`);
  }
  return { content: text || null, toolCalls };
};

const resolveModel = (model) => safeModel(process.env.GEMINI_MODEL) || safeModel(model) || FALLBACK_MODEL;

/** One chat turn on the user's key. */
const getGeminiChatResponse = async (request, { key, model, fetchImpl = (...args) => fetch(...args) }) => {
  const url = `${API_ROOT}/models/${resolveModel(model)}:generateContent`;
  return extractReply(await call(fetchImpl, url, key, buildRequest(request)));
};

/** A JSON-only generation, for sorting transactions. */
const generateJson = async ({ key, model, system, prompt, fetchImpl = (...args) => fetch(...args) }) => {
  const url = `${API_ROOT}/models/${resolveModel(model)}:generateContent`;
  const response = await call(fetchImpl, url, key, {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 8192 },
  });
  const { content } = extractReply(response);
  return JSON.parse(content);
};

module.exports = {
  FALLBACK_MODEL,
  GeminiError,
  buildRequest,
  checkKey,
  extractReply,
  generateJson,
  getGeminiChatResponse,
  pickModel,
  safeModel,
  sanitizeSchema,
  toContents,
};
