/**
 * Empty means same origin: the advisor now ships as a serverless function in
 * this repository (api/chat.js), so a deployed site answers its own API calls
 * and needs no separately hosted backend.
 *
 * Set REACT_APP_API_URL to point at the Java service instead — that is what
 * `npm start` against a local backend needs, since the CRA dev server does not
 * serve the functions. `vercel dev` serves both and needs no override.
 */
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
    headers: { 'Content-Type': 'application/json' },
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
