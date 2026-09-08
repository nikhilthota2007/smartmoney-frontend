# SmartMoney - AI Financial Advisor

An intelligent financial advisory application that provides personalized money-saving advice and budgeting recommendations powered by artificial intelligence.

## Live Demo

**[View Live Application](https://smartmoney-frontend.vercel.app)**

## Features

- Guided five-step intake for income, expenses, debts, accounts and goals, with a completeness meter
- AI-powered financial advice from a Groq-hosted model, which calls the app's own financial logic rather than estimating figures
- Financial health scoring, with coverage and retirement checks alongside it
- Debt payoff calculator with multiple payment strategies, which warns when a minimum payment never covers the interest
- Profile saved on your own device, with JSON export and import
- Dark mode interface
- Responsive design optimized for mobile and desktop

## Technology Stack

- **Frontend Framework:** React 19 (Create React App)
- **Styling:** Hand-written CSS, split by component under `src/styles/`
- **Icons:** Lucide React
- **Testing:** Jest + React Testing Library
- **Hosting:** Vercel
- **API:** Node serverless functions in `api/`, deployed alongside the site

## Local Development

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/nikhilthota2007/smartmoney-frontend.git
cd smartmoney-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the site and its API together:
```bash
npx vercel dev
```

`vercel dev` serves the React app and the functions in `api/` from one origin,
which is how they are deployed. It needs `GROQ_API_KEY` set — either in the
linked Vercel project or in a local `.env` file.

`npm start` runs the React dev server alone. It does not serve `api/`, so point
it at a running backend instead:

```
REACT_APP_API_URL=http://localhost:8080
```

4. Open your browser and navigate to `http://localhost:3000`

## Available Scripts

| Command | What it does |
|---|---|
| `npm start` | Development server on port 3000 |
| `npm test` | Jest in watch mode (`CI=true npm test` for a single run) |
| `npm run lint` | ESLint over `src/` and `api/` |
| `npm run build` | Production build |

## Project Structure

The site serves its own API. `api/` holds Node serverless functions that Vercel
deploys next to the built React app, so a deployment is self-contained and the
live link works with nothing else running.

Those functions are a port of the Java service in
[smartmoney-backend](https://github.com/nikhilthota2007/smartmoney-backend),
which still builds and runs. Both send the same prompt: `api/_lib/prompts/` and
`api/_lib/tools/` are byte-identical copies of the backend's resources, and the
port was verified against the Java original before it replaced it. **Edit the
prompt or the tool schemas in both places, or the two deployments will disagree
about what the advisor is told.**

```
api/                  Serverless API (CommonJS — see api/_lib/prompt.js)
├── chat.js           POST /api/chat
├── health.js         GET /api/health — model, prompt and tool versions, key presence
└── _lib/             Underscore-prefixed, so Vercel does not route it
    ├── advisor.js    The Groq call, message building, reply parsing
    ├── prompt.js     Loads the versioned system prompt
    ├── picture.js    Renders the computed figures the model reads
    ├── tools.js      Loads the tool declarations
    ├── prompts/      Versioned system prompts
    └── tools/        Versioned tool schemas

src/
├── components/       UI, grouped by feature
│   ├── common/       Modal, currency field, dark-mode toggle
│   ├── intake/       Five-step intake wizard
│   ├── chat/         Conversation view and message rendering
│   ├── dashboard/    Financial health score
│   └── planning/     Debt payoff calculator
├── context/          Profile and theme state
├── hooks/            useChat
├── lib/              Financial logic, kept free of React
│   ├── derive.js     Derived metrics (savings rate, DTI, runway)
│   ├── healthScore.js
│   ├── protection.js Coverage and retirement checks
│   ├── planner/      Debt payoff simulation and warnings
│   ├── profile.js    Profile schema, migrations and derived summary
│   ├── profileFile.js JSON export and import
│   ├── storage.js    localStorage persistence
│   └── api.js        API client (same origin by default)
└── styles/           CSS, imported in cascade order by index.css
```

**All financial calculations live in `src/lib/` as pure functions** and are covered by
characterization tests (`src/lib/__tests__/`) that pin their output against golden
values. The AI calls into this logic rather than doing arithmetic itself.

The user's financial profile is stored in `localStorage` on their own device and is
versioned — see `migrateProfile` in `src/lib/profile.js`. There is no account system yet.

## Roadmap

See [`docs/PLAN.md`](docs/PLAN.md) for the full build plan. Phase 0 (foundation) and
Phase 1 (guided intake) are complete. Phase 2 makes the advisor call the financial
logic as tools instead of doing its own arithmetic.

## Deployment

Vercel builds the React app and the `api/` functions from this one repository.
Set `GROQ_API_KEY` in the project's environment variables; `GROQ_MODEL`
optionally overrides the model.

`GET /api/health` reports what a deployment is actually running:

```
Financial Advisor API is running! model=openai/gpt-oss-120b prompt=v4 tools=v1 key=configured [simulate_debt_payoff, evaluate_goal, project_savings]
```

That line is the first thing to check when the advisor reports itself
unavailable — the chat endpoint deliberately returns one generic error for
every upstream failure, so a retired model, a missing key and a rate limit look
identical from the browser. Groq retires model names, and calling a retired one
fails every request; `GROQ_MODEL` changes it without a code change.

## Related Repositories

- [Backend API Repository](https://github.com/nikhilthota2007/smartmoney-backend) — the original Java service the `api/` functions were ported from

## Author

Nikhil Thota
- GitHub: [@nikhilthota2007](https://github.com/nikhilthota2007)

## License

This project is licensed under the MIT License.
