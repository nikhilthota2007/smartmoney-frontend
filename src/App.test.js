import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';
import { PROFILE_KEY } from './lib/storage';

const step = (name) => screen.getByRole('button', { name });
const goToStep = (name) => fireEvent.click(step(name));

const startChat = () =>
  fireEvent.click(screen.getByRole('button', { name: /skip the rest and start asking questions/i }));

/** Add a row to the current step's list and fill in its fields. */
const addRow = (addLabel, values) => {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(addLabel, 'i') }));
  Object.entries(values).forEach(([label, value]) => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  });
};

const enterIncome = (amount) => {
  goToStep('What comes in');
  addRow('Add income source', { Source: 'Salary', 'Net monthly': amount });
};

beforeEach(() => {
  window.localStorage.clear();
  document.body.className = '';
});

describe('intake wizard', () => {
  it('opens on the first step with nothing completed', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'SmartMoney' })).toBeInTheDocument();
    expect(screen.getByText('0% complete')).toBeInTheDocument();
    expect(screen.getByText(/add your income/i)).toBeInTheDocument();
  });

  it('offers every step and lets the user jump between them', () => {
    render(<App />);

    ['What comes in', 'What goes out', 'What you owe', 'What you have', 'What you are working toward']
      .forEach((title) => expect(step(title)).toBeInTheDocument());

    goToStep('What you owe');
    expect(screen.getByRole('button', { name: /add debt/i })).toBeInTheDocument();
  });

  it('advances with Next and goes back', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    expect(screen.getByRole('button', { name: /add fixed expense/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByRole('button', { name: /add income source/i })).toBeInTheDocument();
  });

  it('updates the completeness meter as sections are filled in', () => {
    render(<App />);
    expect(screen.getByText('0% complete')).toBeInTheDocument();

    enterIncome('5000');
    expect(screen.getByText('25% complete')).toBeInTheDocument();

    goToStep('What goes out');
    addRow('Add fixed expense', { Monthly: '1500' });
    expect(screen.getByText('50% complete')).toBeInTheDocument();
  });

  it('lets a row be removed entirely', () => {
    render(<App />);
    enterIncome('5000');
    expect(screen.getByText('25% complete')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /remove row 1/i }));
    expect(screen.getByText('0% complete')).toBeInTheDocument();
  });

  it('persists structured data and resumes at the first gap', () => {
    const { unmount } = render(<App />);
    enterIncome('4200');

    const stored = JSON.parse(window.localStorage.getItem(PROFILE_KEY));
    expect(stored.income[0].netMonthly).toBe('4200');

    unmount();
    render(<App />);

    // Income is done, so the wizard resumes on expenses.
    expect(screen.getByRole('button', { name: /add fixed expense/i })).toBeInTheDocument();
    expect(screen.getByText('25% complete')).toBeInTheDocument();
  });

  it('migrates a v1 record and counts it as complete', () => {
    window.localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        monthlyIncome: '3000', monthlyExpenses: '2000',
        savings: '5000', debts: '1000', goals: 'Save',
      })
    );

    render(<App />);
    expect(screen.getByText('100% complete')).toBeInTheDocument();
  });

  it('survives a corrupt stored profile', () => {
    window.localStorage.setItem(PROFILE_KEY, '{not json');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'SmartMoney' })).toBeInTheDocument();
  });
});

describe('chat', () => {
  it('greets the user and offers example questions', () => {
    render(<App />);
    startChat();

    expect(screen.getByText(/I'm your AI financial advisor/)).toBeInTheDocument();
    expect(screen.getByText('Try asking:')).toBeInTheDocument();
  });

  it('loads an example question into the input instead of sending it', () => {
    render(<App />);
    startChat();
    fireEvent.click(screen.getByRole('button', { name: /How much should I save for an emergency fund/i }));

    expect(screen.getByPlaceholderText(/Ask me about saving money/)).toHaveValue(
      'How much should I save for an emergency fund?'
    );
  });

  it('disables send until there is something to send', () => {
    render(<App />);
    startChat();
    const input = screen.getByPlaceholderText(/Ask me about saving money/);

    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    fireEvent.change(input, { target: { value: 'How do I budget?' } });
    expect(screen.getByRole('button', { name: 'Send message' })).not.toBeDisabled();
  });

  it('returns to the wizard and back without losing the conversation', () => {
    render(<App />);
    startChat();
    fireEvent.change(screen.getByPlaceholderText(/Ask me about saving money/), {
      target: { value: 'draft question' },
    });

    fireEvent.click(screen.getByRole('button', { name: /my finances/i }));
    expect(screen.getByText(/% complete/)).toBeInTheDocument();

    startChat();
    expect(screen.getByText(/I'm your AI financial advisor/)).toBeInTheDocument();
    // One greeting, not two — re-entering must not restart the conversation.
    expect(screen.getAllByText(/I'm your AI financial advisor/)).toHaveLength(1);
  });
});

describe('health score', () => {
  it('scores figures entered through the wizard', () => {
    render(<App />);

    enterIncome('5000');
    goToStep('What goes out');
    addRow('Add fixed expense', { Monthly: '3500' });
    goToStep('What you have');
    addRow('Add account', { Name: 'Savings', Balance: '10000' });
    goToStep('What you owe');
    addRow('Add debt', { Name: 'Card', Balance: '5000', APR: '20', Minimum: '150' });

    startChat();
    fireEvent.click(screen.getByRole('button', { name: /Financial Health Score/i }));

    // Same inputs as the "typical" characterization fixture, which scores 75.
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('asks for figures when none were entered', () => {
    render(<App />);
    startChat();
    fireEvent.click(screen.getByRole('button', { name: /Financial Health Score/i }));

    expect(
      screen.getByText('Enter your financial information to see your health score')
    ).toBeInTheDocument();
  });

  it('lists coverage gaps alongside the score', () => {
    render(<App />);
    enterIncome('5000');
    startChat();
    fireEvent.click(screen.getByRole('button', { name: /Financial Health Score/i }));

    const checklist = screen.getByRole('region', { name: 'Coverage & Retirement' });
    expect(within(checklist).getByText('Health insurance')).toBeInTheDocument();
    expect(within(checklist).getByText('Disability insurance')).toBeInTheDocument();
  });
});

describe('debt payoff calculator', () => {
  const openCalculator = () =>
    fireEvent.click(screen.getByRole('button', { name: /Debt Payoff Calculator/i }));

  it('prompts for debts, then shows all three strategies once one is entered', () => {
    render(<App />);
    startChat();
    openCalculator();

    expect(screen.getByText('Add your debts above to see payoff strategies')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /add debt/i }));
    fireEvent.change(screen.getByPlaceholderText('Balance'), { target: { value: '5000' } });
    fireEvent.change(screen.getByPlaceholderText('Rate'), { target: { value: '22.99' } });
    fireEvent.change(screen.getByPlaceholderText('Min Payment'), { target: { value: '150' } });

    expect(screen.getByText('Debt Avalanche')).toBeInTheDocument();
    expect(screen.getByText('Debt Snowball')).toBeInTheDocument();
    expect(screen.getByText('Smart Payment Plan')).toBeInTheDocument();
    expect(screen.getByText('$5000.00')).toBeInTheDocument();
  });

  it('warns when a minimum payment never covers the interest', () => {
    render(<App />);
    startChat();
    openCalculator();

    fireEvent.click(screen.getByRole('button', { name: /add debt/i }));
    fireEvent.change(screen.getByPlaceholderText('Name (e.g., Credit Card)'), {
      target: { value: 'Runaway Card' },
    });
    fireEvent.change(screen.getByPlaceholderText('Balance'), { target: { value: '20000' } });
    fireEvent.change(screen.getByPlaceholderText('Rate'), { target: { value: '29.99' } });
    fireEvent.change(screen.getByPlaceholderText('Min Payment'), { target: { value: '50' } });

    expect(
      screen.getByText(/Runaway Card never gets paid off at its minimum payment/i)
    ).toBeInTheDocument();
  });

  it('shows no warning for an ordinary debt', () => {
    render(<App />);
    startChat();
    openCalculator();

    fireEvent.click(screen.getByRole('button', { name: /add debt/i }));
    fireEvent.change(screen.getByPlaceholderText('Balance'), { target: { value: '5000' } });
    fireEvent.change(screen.getByPlaceholderText('Rate'), { target: { value: '10' } });
    fireEvent.change(screen.getByPlaceholderText('Min Payment'), { target: { value: '200' } });

    expect(screen.queryByText(/never gets paid off/i)).not.toBeInTheDocument();
  });

  it('shares its debt list with the wizard', () => {
    render(<App />);
    goToStep('What you owe');
    addRow('Add debt', { Name: 'Car Loan', Balance: '15000', APR: '6.5', Minimum: '350' });

    startChat();
    openCalculator();

    expect(screen.getByDisplayValue('Car Loan')).toBeInTheDocument();
    expect(screen.getByText('$15000.00')).toBeInTheDocument();
  });

  it('keeps the extra payment when closed and reopened', () => {
    render(<App />);
    startChat();
    openCalculator();

    fireEvent.click(screen.getByRole('button', { name: /add debt/i }));
    fireEvent.change(screen.getByPlaceholderText('Balance'), { target: { value: '5000' } });
    fireEvent.change(screen.getByPlaceholderText('Rate'), { target: { value: '10' } });
    fireEvent.change(screen.getByPlaceholderText('Min Payment'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Extra Monthly Payment/i), { target: { value: '250' } });

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    openCalculator();

    expect(screen.getByLabelText(/Extra Monthly Payment/i)).toHaveValue(250);
  });
});

describe('export and import', () => {
  it('reports a file that is not a profile', async () => {
    render(<App />);

    const file = new File(['definitely not json'], 'notes.json', { type: 'application/json' });
    const input = screen.getByLabelText('Import a profile file');
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid JSON/);
  });

  it('loads an exported profile', async () => {
    render(<App />);

    const exported = JSON.stringify({
      schemaVersion: 2,
      summary: { monthlyIncome: '', monthlyExpenses: '', savings: '', debts: '', goals: '' },
      income: [{ id: 1, source: 'Salary', netMonthly: '7000', stability: 'stable' }],
    });
    const file = new File([exported], 'smartmoney-profile.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('Import a profile file'), { target: { files: [file] } });

    expect(await screen.findByText('25% complete')).toBeInTheDocument();
    expect(screen.getByDisplayValue('7000')).toBeInTheDocument();
  });
});

describe('dark mode', () => {
  it('toggles the body class and remembers the choice', () => {
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByTitle('Switch to Dark Mode'));
    expect(document.body).toHaveClass('dark-mode');

    unmount();
    render(<App />);
    expect(document.body).toHaveClass('dark-mode');
  });
});
