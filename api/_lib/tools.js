/**
 * The tool schemas declared to the model. A port of AdvisorTools.java.
 *
 * Loaded from a versioned resource for the same reason as the prompt: so the
 * definitions can be reviewed as a diff. Nothing is executed here — the browser
 * runs the calculations against the financial logic the user's screen uses, so
 * the advisor and the dashboard cannot disagree. See src/lib/tools/index.js.
 */
const { readFileSync } = require('node:fs');
const path = require('node:path');

const TOOLS_VERSION = 'v1';

const TOOLS_FILE = path.join(__dirname, 'tools', `advisor-tools.${TOOLS_VERSION}.json`);

const parsed = JSON.parse(readFileSync(TOOLS_FILE, 'utf8'));
if (!Array.isArray(parsed.tools) || parsed.tools.length === 0) {
  throw new Error(`No tools declared in ${TOOLS_FILE}`);
}

/** The `tools` array sent to Groq, in OpenAI function-calling format. */
const TOOL_DECLARATIONS = parsed.tools;

const toolNames = () => TOOL_DECLARATIONS.map((tool) => tool.function.name);

module.exports = { TOOLS_VERSION, TOOL_DECLARATIONS, toolNames };
