/**
 * POST /api/chat — the advisor endpoint.
 *
 * A port of FinancialAdvisorController.chat. This runs as a Vercel serverless
 * function alongside the built React app, so the deployed site answers its own
 * API calls and needs no separately hosted Java service.
 *
 * Same request and response shapes as the Spring backend, so src/lib/api.js is
 * unchanged and either can serve the app.
 */
const { GroqError, getChatResponse } = require('./_lib/advisor.js');

/** What the client is told when the upstream call fails. Details stay in the logs. */
const GENERIC_ERROR = 'The advisor is temporarily unavailable. Please try again in a moment.';

const failure = (res) => res.status(200).json({
  response: null,
  success: false,
  error: GENERIC_ERROR,
});

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ response: null, success: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const reply = await getChatResponse(body);

    const response = { response: reply.content, success: true };
    if (reply.toolCalls.length > 0) {
      // The client runs these and posts again with the results.
      response.toolCalls = reply.toolCalls;
    }
    return res.status(200).json(response);
  } catch (error) {
    if (error instanceof GroqError) {
      // Groq's body says why — a retired model, a bad key, a rate limit — and
      // that distinction is invisible from the browser, which sees the same
      // generic error for all of them.
      console.error('Groq rejected the request', { status: error.status, body: error.body });
    } else {
      // Error messages can carry upstream URLs, keys and internal state, so they
      // are logged rather than returned to the browser.
      console.error('Chat request failed', error);
    }
    return failure(res);
  }
};

module.exports.GENERIC_ERROR = GENERIC_ERROR;
