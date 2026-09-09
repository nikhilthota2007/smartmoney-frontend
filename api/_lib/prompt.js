/**
 * Loads the advisor's system prompt from a versioned file and fills in the
 * user's financial picture. A port of AdvisorPrompt.java.
 *
 * The prompt lives in prompts/ rather than in source so it can be reviewed as a
 * diff and rolled back on its own. Bump PROMPT_VERSION and add a new file when
 * the wording changes materially. The file here is byte-identical to the
 * backend's copy, so the two deployments cannot drift in what they tell the
 * model.
 *
 * CommonJS, and __dirname rather than import.meta.url, because that is the one
 * form that resolves the same way under the Vercel runtime, plain node, and the
 * jest that create-react-app runs.
 */
const { readFileSync } = require('node:fs');
const path = require('node:path');

const PROMPT_VERSION = 'v6';

const PROMPT_FILE = path.join(__dirname, 'prompts', `advisor-system-prompt.${PROMPT_VERSION}.md`);
const PICTURE_PLACEHOLDER = '{{financialPicture}}';

/** Everything up to and including this marker is authoring notes, not prompt text. */
const HEADER_END = '-->';

// Read once, at module load. A missing prompt means the advisor cannot answer
// safely, so this fails the invocation rather than serving an unguarded model.
const raw = readFileSync(PROMPT_FILE, 'utf8');
const headerEnd = raw.indexOf(HEADER_END);
const PROMPT_TEMPLATE = (headerEnd >= 0 ? raw.slice(headerEnd + HEADER_END.length) : raw).trim();

/**
 * The system prompt for this request, with the computed picture substituted in.
 *
 * The replacement is a function rather than a string so that a `$` in the
 * picture — and every dollar figure has one — is inserted literally instead of
 * being read as a replacement pattern.
 */
const buildSystemPrompt = (picture) =>
  PROMPT_TEMPLATE.split(PICTURE_PLACEHOLDER).join(picture);

module.exports = { PROMPT_VERSION, PROMPT_TEMPLATE, buildSystemPrompt };
