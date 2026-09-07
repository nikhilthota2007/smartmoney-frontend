# SmartMoney - AI Financial Advisor

An intelligent financial advisory application that provides personalized money-saving advice and budgeting recommendations powered by artificial intelligence.

## Live Demo

**[View Live Application](https://smartmoney-frontend.vercel.app)**

## Features

- Guided five-step intake for income, expenses, debts, accounts and goals, with a completeness meter
- AI-powered financial advice using Groq's LLaMA model
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
- **Backend Integration:** RESTful API

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

3. Create a `.env` file in the root directory:
```
REACT_APP_API_URL=http://localhost:8080
```

4. Start the development server:
```bash
npm start
```

5. Open your browser and navigate to `http://localhost:3000`

## Available Scripts

| Command | What it does |
|---|---|
| `npm start` | Development server on port 3000 |
| `npm test` | Jest in watch mode (`CI=true npm test` for a single run) |
| `npm run lint` | ESLint over `src/` |
| `npm run build` | Production build |

## Project Structure

The application consists of a React frontend that communicates with a Java Spring Boot backend. User financial data is processed through the backend API, which interfaces with Groq's AI model to generate personalized financial advice.

```
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
│   └── api.js        Backend client
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

## Related Repositories

- [Backend API Repository](https://github.com/nikhilthota2007/smartmoney-backend)

## Author

Nikhil Thota
- GitHub: [@nikhilthota2007](https://github.com/nikhilthota2007)

## License

This project is licensed under the MIT License.
