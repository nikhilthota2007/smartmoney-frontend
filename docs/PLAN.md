# SmartMoney — AI Financial Advisor: Project Plan

**Status:** planning document
**Owner:** Nikhil Thota
**Repos:** `nikhilthota2007/smartmoney-frontend` (React) · `nikhilthota2007/smartmoney-backend` (Java / Spring Boot)

---

## 1. What we're building

An AI financial advisor that does three things, in order:

1. **Collects** a complete-enough picture of a user's finances through a guided intake, not a five-box form.
2. **Answers** free-form financial questions with advice grounded in *that user's* actual numbers.
3. **Plans** — turns goals ("house in 4 years", "debt-free by 2028", "retire at 60") into dated, month-by-month plans the user can track against and re-run under different assumptions.

The third item is the one that separates this from a chatbot with a system prompt. Everything below is organized around getting there.

**Non-goals (explicitly out of scope):** executing trades, moving money, connecting to brokerages for transactions, tax filing, or anything that constitutes regulated investment advice. See §9.

---

## 2. Where the project stands today

The current app (`src/App.js`, 971 lines, single component) already works end to end and is deployed to Vercel. Honest inventory:

| Area | What exists | Assessment |
|---|---|---|
| Intake | 5 fields: `monthlyIncome`, `monthlyExpenses`, `savings`, `debts`, `goals` (`src/App.js:266`) | Too coarse to plan from. One lump "expenses" number can't produce a budget; one lump "debts" number can't produce a payoff schedule (the calculator asks for debts *again*, separately). |
| Health score | `calculateHealthScore()` — savings rate, debt-to-income, emergency-fund months → 0–100 (`src/App.js:14`) | Solid, keep. Reasonable weightings. Extend, don't rewrite. |
| Debt planning | `calculateStrategy()` avalanche/snowball + "smart payment plan" (`src/App.js:112`, `:176`) | Genuinely good — real amortization loop, per-debt tracking. This is the seed of the planning engine. |
| Chat | `POST /api/chat` with `{financialData, message, history}` (`src/App.js:370`) | Works, but stateless: nothing is persisted, history lives in React state and dies on refresh. |
| Persistence | `localStorage` for dark mode only (`src/App.js:289`) | No user accounts, no saved profile. Every visit starts from zero. |
| Structure | One component, one 1363-line CSS file, no router, no tests beyond the CRA default (`src/App.test.js`) | Will not survive the features below. Needs decomposition before Phase 2, not after. |
| Docs | README claims Tailwind CSS; the project uses hand-written CSS with no Tailwind dependency | Fix the README. |

**Conclusion:** the domain math is the strong part and should be preserved. The data model, persistence layer, and component structure are the constraints. Plan accordingly: refactor first, then build.

---

## 3. The data model

Everything downstream depends on this. Current five loose strings become a versioned profile.

```
FinancialProfile
├── identity        { id, createdAt, updatedAt, schemaVersion }
├── household       { filingStatus, dependents, state, ageOrBirthYear }
├── income[]        { source, grossMonthly, netMonthly, stability: stable|variable|seasonal,
│                     growthRatePct }
├── expenses        fixed[]    { category, amount }        // rent, insurance, subscriptions
│                   variable[] { category, avgAmount }     // food, transport, discretionary
│                   (categories from a fixed enum so budgeting can reason about them)
├── debts[]         { name, type: card|student|auto|mortgage|personal|medical,
│                     balance, apr, minPayment, termMonths? }
├── assets[]        { name, type: checking|savings|hysa|brokerage|401k|ira|hsa|property|other,
│                     balance, apy?, employerMatchPct? }
├── protection      { emergencyFundTarget, insurance: { health, life, disability, renters } }
├── riskProfile     { toleranceScore 1–10, horizonYears, questionnaireAnswers[] }
└── goals[]         { id, name, type: emergency|debt|purchase|education|retirement|custom,
                      targetAmount, targetDate, priority, currentProgress, linkedAccountId? }
```

**Migration path.** Keep the old shape readable: a `v1 → v2` adapter maps `monthlyExpenses` → a single `variable[{category:'uncategorized'}]` entry and `debts` → one `debts[]` row, so existing users and the existing health-score code keep working while the richer fields fill in over time.

**Derived values** (computed, never stored): net cash flow, savings rate, DTI, emergency-fund months, effective blended APR, net worth. These already partly exist in `calculateHealthScore` and should move to a shared `src/lib/derive.js` used by the score, the planner, and the AI context builder — one source of truth, so the chat can never contradict the dashboard.

---

## 4. Intake: how we actually collect this

A 40-field form gets abandoned. Three mechanisms, in priority order:

1. **Progressive wizard** — 5 short steps (Income → Expenses → Debts → Assets → Goals), each skippable, with a live completeness meter ("62% complete — add your debts to unlock the payoff plan"). Save on every step, resume anywhere.
2. **Conversational fill** — the advisor notices gaps and asks in-chat: *"To answer that I need your student-loan APR — what is it?"* The answer writes straight into the profile via a `update_profile` tool call (§6). This is the highest-leverage intake path and should not be an afterthought.
3. **Sensible defaults with visible assumptions** — never block on a missing number. Assume, label it clearly ("assuming 6.5% APR — tap to correct"), and let the user fix it. Every assumption is rendered inline, never hidden in a prompt.

Validation rules worth enforcing from day one: expenses > income is allowed (it's a real and important state — it drives a deficit plan, not an error); APR entered as `24` vs `0.24` must be disambiguated; negative balances rejected; savings goals with dates in the past flagged.

---

## 5. The planning engine (the core differentiator)

Pure functions, no AI, fully unit-testable. The AI *calls* these; it never does arithmetic itself. This is the single most important architectural decision in the project — LLMs are unreliable calculators and completely reliable explainers.

**`src/lib/planner/`**

| Module | Responsibility |
|---|---|
| `cashflow.js` | Monthly surplus/deficit; allocation waterfall: minimums → emergency buffer → employer match → high-APR debt → goals → long-term investing |
| `debt.js` | Lift `calculateStrategy()` out of `App.js` unchanged; add per-debt payoff dates, total-interest deltas between strategies, and a consolidation/refi comparison |
| `goals.js` | Required monthly contribution for a goal; feasibility verdict; conflict detection when goals compete for the same surplus |
| `projection.js` | Month-by-month net-worth path over N years with configurable return/inflation assumptions |
| `retirement.js` | 401k/IRA contribution modeling, employer match capture, target-nest-egg from a replacement-rate assumption |
| `scenarios.js` | What-if deltas: raise, job loss, new car, baby, move, extra $200/mo — each returns a diff against the baseline plan |
| `assumptions.js` | One place for every rate the model uses (inflation, market return, wage growth), each with a source comment and user override |

**Output contract — the `Plan` object:**
```
Plan {
  generatedAt, assumptionsUsed[],
  monthlyAllocation[ { target, amount, rationale } ],
  timeline[ { month, netWorth, totalDebt, emergencyMonths, goalProgress{} } ],
  milestones[ { date, event } ],          // "debt-free", "6mo emergency fund funded"
  warnings[],                              // "goals require $2,140/mo; surplus is $1,300"
  confidence: high|medium|low              // driven by profile completeness
}
```

Every number the AI states in chat must trace back to a field on this object. If it isn't in the `Plan`, the advisor doesn't assert it.

**Monte Carlo (Phase 4):** 1,000 runs over the projection with randomized returns → "78% of scenarios reach your goal by 2031." Run it in a Web Worker; it will jank the UI otherwise.

---

## 6. AI architecture

**Pattern: tool-calling over a grounded context, not prompt-stuffing.**

**Context builder** (`src/lib/aiContext.js`) assembles, per request: profile summary + derived metrics + current `Plan` snapshot + last N chat turns + explicit list of *missing* fields. Serialized compactly — a table, not prose JSON dumps — and capped to a token budget so a long conversation can't crowd out the financial facts.

**Tools exposed to the model** (executed server-side, results fed back before the model answers):

| Tool | Purpose |
|---|---|
| `get_profile()` | Fetch current financial profile |
| `update_profile(patch)` | Write user-stated facts back into the profile (drives conversational intake) |
| `run_projection(params)` | Call `projection.js` |
| `simulate_scenario(change)` | Call `scenarios.js` |
| `compare_debt_strategies()` | Call `debt.js` |
| `evaluate_goal(goalId)` | Feasibility + required contribution |

**System prompt requirements** (versioned in the backend repo, not hardcoded in a string literal):
- Use only numbers returned by tools; never estimate arithmetic inline.
- Name the assumption behind every projection.
- Give a concrete next action with a dollar amount and a date, not general principles.
- Flag when a question needs a human professional (tax law, estate planning, insurance underwriting, anything state-specific).
- Refuse to recommend specific securities or time the market.

**Response format:** stream tokens (SSE) — the current implementation blocks on the full response with a spinner (`sendMessage()`, `src/App.js:360`), which feels slow at Groq speeds and much worse on a larger model. Structure answers as: direct answer → the numbers → the reasoning → next step. The existing `formatMessage()` (`src/App.js:220`) handles bold/lists and can be extended to render inline plan cards and charts the model references by id.

**Guardrails:** server-side output scan for prohibited advice patterns (specific tickers, guaranteed returns, "you should definitely"); a required non-dismissible disclaimer on first session; log every tool call for auditability.

**Model choice:** keep Groq/LLaMA for speed on simple Q&A; route planning-heavy turns (multi-tool, long context) to a stronger model. Make it a config value, not a code change — model quality moves faster than this codebase will.

---

## 7. Architecture & stack

**Frontend** — stay on React 19 + CRA for now (migrating to Vite is worth doing but is not on the critical path; revisit at Phase 3 if build times bite).

```
src/
├── components/
│   ├── intake/      WizardShell, IncomeStep, ExpenseStep, DebtStep, AssetStep, GoalStep
│   ├── chat/        ChatWindow, MessageBubble, PlanCard, StreamingIndicator
│   ├── dashboard/   HealthScore, NetWorthChart, CashflowBreakdown, GoalTracker
│   ├── planning/    PlanTimeline, ScenarioSandbox, DebtCalculator
│   └── common/      Modal, CurrencyInput, Tooltip, AssumptionChip
├── lib/             derive.js, planner/*, aiContext.js, api.js, storage.js
├── hooks/           useProfile, useChat, usePlan
├── context/         ProfileContext, ThemeContext
└── styles/          split index.css by component; CSS variables for theming
```

State: React Context + `useReducer` for the profile — Redux is overkill here and a single shared context keeps the "one source of truth" property that §3 depends on.

### Backend: what is actually there

Written after reading [`smartmoney-backend`](https://github.com/nikhilthota2007/smartmoney-backend) rather than assuming. It is small — 333 lines of Java, Spring Boot 4.0.1 on Java 21, deployed to Railway.

| Piece | State |
|---|---|
| `FinancialAdvisorController` | `POST /api/chat`, `GET /api/health`. CORS from `${FRONTEND_URL}`. |
| `AdvisorService` | Calls Groq's OpenAI-compatible endpoint with `llama-3.3-70b-versatile`. Was named `GeminiService`; it has never called Gemini. |
| `FinancialData` | The same five string fields as the frontend's `summary`. The v2 schema's `toFinancialData()` maps onto it exactly, so no backend change was needed for Phase 0. |
| System prompt | Strongly anti-debt advisory persona. Now versioned in `resources/prompts/`. |
| Persistence | None. No database, no user records — matching the frontend's `localStorage`-only state. |

**Fixed in the guardrails pass:** the prompt moved out of Java string concatenation into a versioned file with a `SAFETY AND SCOPE` section (disclaimer framing, professional escalation, no specific securities, no invented figures), asserted by tests that fail the build if a guardrail is removed. Exception messages no longer reach the browser. `RestTemplate` is a single bean with timeouts. `contextLoads` passes without a real API key — it never had.

**Still open, and this is the important one:** the model receives only the five raw figures and does its own arithmetic in prose. It has no access to the health score, the payoff schedule, or anything else `src/lib/` computes. Guardrail 4 tells it to ask rather than invent, which is a mitigation, not a fix — the fix is the tool-calling architecture in §6, and it is the single largest remaining gap between this app and a trustworthy advisor.

**Still to build** (unchanged from the original plan): `/api/chat` as SSE, `/api/profile` (CRUD), `/api/plan` (generate/recompute), `/api/scenarios`. Postgres for profiles, goals and chat history. **API keys stay server-side** — this is already correct and must not regress into the frontend.

**Auth:** email magic-link or OAuth. Until it ships, encrypted `localStorage` with an explicit "your data is on this device only" notice, and a JSON export/import so a user can move it.

---

## 8. Roadmap

Phases are sequenced so each one ships something usable. Estimates assume part-time solo work.

### Phase 0 — Foundation ✅ *complete*
- ✅ `App.js` split into the component tree above; 971 lines → 30.
- ✅ Financial math extracted to `src/lib/` behind **306 characterization tests** generated from the pre-refactor implementation, so the extraction is provably output-identical.
- ✅ `ProfileContext` + `ThemeContext`; v2 schema with a v1→v2 adapter.
- ✅ Profile persisted to `localStorage` with schema versioning and corrupt-record recovery.
- ✅ `index.css` split into eight files under `src/styles/`; built CSS verified rule-for-rule identical against a build of the old code.
- ✅ README corrected; `DISABLE_ESLINT_PLUGIN=true` removed from the build after fixing the underlying lint error; `npm run lint` added.
- *Result:* 337 tests passing, ESLint clean, `CI=true npm run build` green with linting enabled.

### Phase 1 — Real intake *(~2 weeks)*
- 5-step wizard, resumable, with the completeness meter.
- Full debts/assets/expense-category capture; delete the duplicate debt entry in the calculator modal by reading from the shared profile.
- Extended health score using the richer data (add insurance coverage and retirement-contribution factors).
- Export/import profile as JSON.
- *Done when:* a user can enter a complete picture in under 5 minutes and it survives a refresh.

### Phase 2 — Grounded advisor *(~2 weeks)*
- Context builder + tool-calling backend; streaming responses.
- Conversational profile updates (`update_profile`) with a visible "I updated your profile" confirmation the user can undo.
- Persisted chat history; multiple named conversations.
- Guardrails, disclaimers, tool-call logging.
- *Done when:* the advisor answers with the user's real numbers and can fill gaps by asking.

### Phase 3 — Planning *(~3 weeks)*
- Goal creation and tracking; the allocation waterfall.
- `Plan` generation + timeline visualization (net worth, debt, goal progress).
- Scenario sandbox with side-by-side baseline vs. what-if.
- Plan cards rendered inline in chat.
- *Done when:* a user gets a dated month-by-month plan and can ask "what if I get a $10k raise?" and see it re-run.

### Phase 4 — Depth *(~3 weeks)*
- Monte Carlo confidence bands (Web Worker).
- Retirement module with employer-match optimization.
- Plaid integration for real transaction data (optional, evaluate cost/complexity honestly — it is a large surface area for a solo project and may be worth deferring indefinitely).
- Monthly check-in flow: "you saved $340 more than planned — here's the updated timeline."
- PDF plan export.

### Phase 5 — Production *(~2 weeks)*
- Auth + server persistence + migration off `localStorage`.
- Accessibility pass (keyboard nav, screen readers, contrast in both themes — the current gradient/dark-mode combination needs auditing).
- Mobile layout pass; error boundaries; rate limiting; analytics.
- CI: lint + test on PR. Note `DISABLE_ESLINT_PLUGIN=true` in the build script (`package.json`) — that was a deploy workaround; fix the underlying lint errors and remove it.

---

## 9. Compliance, privacy, security

Not optional, and cheapest to build in early:

- **Disclaimer:** "Educational information, not licensed financial, tax, or legal advice" — on first run, in the footer, and in the AI's own framing.
- **Escalation:** the model must recommend a CFP/CPA for tax strategy, estate planning, insurance underwriting, and anything jurisdiction-specific.
- **Never:** recommend specific securities, promise returns, or advise on regulated transactions.
- **Data:** financial data is sensitive. Encrypt at rest, TLS in transit, no PII in logs or LLM traces, a working delete-my-data path, and a plain-language statement of what is sent to the model provider. If Plaid ships, its data-handling requirements govern.
- **Secrets:** LLM keys server-side only, permanently.

---

## 10. Testing & quality

| Layer | Coverage target |
|---|---|
| `lib/planner/*` | Near-100%. This is money math — test edge cases: zero income, expenses > income, 0% APR, a debt whose minimum payment doesn't cover interest (infinite payoff — must be detected, not looped forever), goals already met, negative net worth |
| `derive.js` | Full — every consumer depends on it agreeing with itself |
| Components | React Testing Library on the wizard, chat, and dashboard |
| API | Contract tests against a mocked backend |
| AI | A golden-question set (~30 prompts) run against each prompt change, checking that stated numbers match tool outputs — this is regression testing for the prompt |

Add CI on PRs at Phase 0, not Phase 5.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| AI states wrong numbers | Tools compute, model explains. Golden-question regression suite. Never let the model do arithmetic. |
| Intake abandonment | Progressive disclosure, skippable steps, conversational fill, defaults with visible assumptions |
| `App.js` grows to 2,000 lines and stalls the project | Phase 0 is non-negotiable and comes first |
| Projection assumptions are wrong (they will be) | Surface every assumption, let users override, show ranges not point estimates |
| Regulatory exposure | Educational framing, hard refusals, professional escalation (§9) |
| Scope creep (Plaid, tax optimization, crypto…) | Phases 0–3 are the product. Everything after is optional. |

---

## 12. Immediate next steps

Phase 0 has landed. Phase 1 starts here:

1. Build the five-step wizard shell over the existing `ProfileContext`, writing into the v2 sections (`income[]`, `expenses`, `assets[]`, `goals[]`) that are currently defined but unpopulated.
2. Point the debt calculator at `profile.debts` as its only source — the duplicate debt entry is already gone from component state, so this is now a UI change alone.
3. Add the completeness meter, reading from a new `profileCompleteness()` in `src/lib/profile.js`.
4. Extend the health score with the richer data (insurance coverage, retirement contributions) — extending `deriveMetrics` first, so the score and the future planner stay in agreement.
5. Surface the payoff-horizon case: a debt whose minimum never covers its interest currently caps out silently at 600 months (pinned in the characterization tests). It should be reported to the user as "this debt never gets paid off at this payment".

Item 5 is the one real bug the Phase 0 tests uncovered.
