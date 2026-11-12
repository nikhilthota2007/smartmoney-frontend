/**
 * Empty means same origin: the advisor now ships as a serverless function in
 * this repository (api/chat.js), so a deployed site answers its own API calls
 * and needs no separately hosted backend.
 *
 * Set REACT_APP_API_URL to point at the Java service instead — that is what
 * `npm start` against a local backend needs, since the CRA dev server does not
 * serve the functions. `vercel dev` serves both and needs no override.
 */
import { aiHeaders } from './aiKey';

const API_BASE = process.env.REACT_APP_API_URL ?? '';

/**
 * Ask the advisor a question.
 *
 * `financialData` (the five headline figures) is still sent so an older backend
 * keeps working; `financialContext` carries the computed picture a current
 * backend prefers.
 *
 * Resolves to `{ response, toolCalls }`: either an answer, or a request to run
 * calculations here and send the results back. Throws with a readable message.
 */
export const sendChatMessage = async ({ financialData, financialContext, message, history }) => {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    // The user's own Gemini key rides along when they have pasted one.
    headers: { 'Content-Type': 'application/json', ...aiHeaders() },
    body: JSON.stringify({ financialData, financialContext, message, history }),
  });

  if (!response.ok) {
    throw new Error('Failed to get response from server');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Unknown error occurred');
  }
  return { response: data.response, toolCalls: data.toolCalls || [] };
};

/**
 * Sort statement transactions the device could not. `items` are already
 * redacted: { id, description, amount }. Resolves to { [id]: category }.
 */
export const categorizeTransactions = async (items) => {
  const response = await fetch(`${API_BASE}/api/statement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...aiHeaders() },
    body: JSON.stringify({ items }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Couldn't sort those transactions right now.");
  }
  return data.categories;
};

/** Check a pasted Gemini key. Resolves to { valid, model } or { valid: false, error }. */
export const checkGeminiKey = async (key) => {
  try {
    const response = await fetch(`${API_BASE}/api/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Gemini-Key': key.trim() },
      body: '{}',
    });
    return await response.json();
  } catch {
    return { valid: false, error: "Couldn't reach SmartMoney to check the key. Try again in a moment." };
  }
};
