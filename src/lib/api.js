const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

/**
 * Ask the advisor a question.
 * Resolves to the assistant's reply text; throws with a readable message.
 */
export const sendChatMessage = async ({ financialData, message, history }) => {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ financialData, message, history }),
  });

  if (!response.ok) {
    throw new Error('Failed to get response from server');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Unknown error occurred');
  }
  return data.response;
};
