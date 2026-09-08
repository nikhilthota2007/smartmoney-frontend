/**
 * GET /api/health — liveness, plus what this deployment is actually running.
 *
 * A port of FinancialAdvisorController.health. The versions are here so a deploy
 * can be verified in one request: an answer that quotes no computed figures is
 * otherwise ambiguous between the model declining to call a tool and an older
 * build that has no tools to call.
 *
 * The model name is here because Groq retires models, and the only symptom of
 * calling a retired one is the generic chat error. `key` reports whether
 * GROQ_API_KEY is set on this deployment — never its value — because a missing
 * environment variable looks identical from the browser.
 */
const { PROMPT_VERSION } = require('./_lib/prompt.js');
const { TOOLS_VERSION, toolNames } = require('./_lib/tools.js');
const { modelName } = require('./_lib/advisor.js');

module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(200).send(
    'Financial Advisor API is running!'
    + ` model=${modelName()}`
    + ` prompt=${PROMPT_VERSION}`
    + ` tools=${TOOLS_VERSION}`
    + ` key=${process.env.GROQ_API_KEY ? 'configured' : 'missing'}`
    + ` [${toolNames().join(', ')}]`,
  );
};
