import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { AppProviders, AppRoutes, ROUTER_FUTURE } from './Root';
import { PROFILE_KEY } from './lib/storage';
import { STATEMENT_KEY } from './app/StatementContext';
import { categorizeTransactions } from './lib/api';

jest.mock('./lib/api', () => ({
  ...jest.requireActual('./lib/api'),
  categorizeTransactions: jest.fn(),
}));

/** Renders the routed app at `path`, exposing the current location. */
const renderAt = (path) => {
  const location = { current: null };
  const navigate = { current: null };
  const LocationProbe = () => {
    location.current = useLocation();
    navigate.current = useNavigate();
    return null;
  };
  const view = render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]} future={ROUTER_FUTURE}>
        <AppRoutes />
        <LocationProbe />
      </MemoryRouter>
    </AppProviders>
  );
  return { ...view, location, navigate };
};

const storedProfile = () => JSON.parse(window.localStorage.getItem(PROFILE_KEY));

const GREETING = /I've got your numbers in front of me/;

const CSV = [
  'Transaction Date,Post Date,Description,Category,Type,Amount',
  '03/02/2026,03/03/2026,SPOTIFY USA,,Sale,-11.99',
  '03/03/2026,03/04/2026,UBER *EATS PENDING,,Sale,-34.18',
  '03/04/2026,03/05/2026,TRADER JOE S #552,,Sale,-86.42',
  '03/07/2026,03/08/2026,DOORDASH*CHIPOTLE,,Sale,-27.30',
  '03/13/2026,03/14/2026,UBER *EATS PENDING,,Sale,-41.62',
  '03/15/2026,03/15/2026,Payment Thank You-Mobile,,Payment,250.00',
  '03/20/2026,03/21/2026,NEIGHBOURHOOD THING 4412,,Sale,-19.00',
  '03/31/2026,03/31/2026,DOORDASH*SWEETGREEN,,Sale,-22.70',
].join('\n');

const csvFile = (text = CSV) => new File([text], 'march.csv', { type: 'text/csv' });

beforeEach(() => {
  window.localStorage.clear();
  window.scrollTo = jest.fn();
  categorizeTransactions.mockReset();
});

describe('routes', () => {
  it('serves the landing page at /', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: /money, minus the dread/i })).toBeInTheDocument();
  });

  it('goes from the landing page to setup', async () => {
    const { location } = renderAt('/');
    fireEvent.click((await screen.findAllByRole('link', { name: /get my plan/i }))[0]);

    expect(location.current.pathname).toBe('/start');
    expect(screen.getByRole('heading', { name: /what would make money feel lighter/i })).toBeInTheDocument();
  });

  it('greets once when /plan is opened directly', () => {
    renderAt('/plan');
    expect(screen.getAllByText(GREETING)).toHaveLength(1);
  });

  it('keeps /advisor working by sending it to /plan', () => {
    const { location } = renderAt('/advisor');
    expect(location.current.pathname).toBe('/plan');
  });

  it('sends My finances to the detailed editor and back', () => {
    const { location } = renderAt('/plan');
    fireEvent.click(screen.getByRole('button', { name: /my finances/i }));
    expect(location.current.pathname).toBe('/numbers');
    expect(screen.getByText(/% complete/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /skip the rest and start asking questions/i }));
    expect(location.current.pathname).toBe('/plan');
  });

  it('redirects an unknown path to the landing page', async () => {
    const { location } = renderAt('/nope');
    expect(location.current.pathname).toBe('/');
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('sets a page title per route', () => {
    renderAt('/plan');
    expect(document.title).toMatch(/your plan/i);
  });
});

describe('setup', () => {
  it('saves the goal and take-home pay, then opens the plan', () => {
    const { location } = renderAt('/start');

    fireEvent.click(screen.getByRole('radio', { name: /build a safety net/i }));
    fireEvent.change(screen.getByLabelText('How much?'), { target: { value: '3000' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    fireEvent.change(screen.getByLabelText('Monthly take-home pay'), { target: { value: '3400' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByRole('heading', { name: /show me where it goes/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));

    expect(location.current.pathname).toBe('/plan');
    const profile = storedProfile();
    expect(profile.goals).toEqual([expect.objectContaining({ type: 'emergency', name: 'Build a safety net', targetAmount: '3000', source: 'onboarding' })]);
    expect(profile.income[0].netMonthly).toBe('3400');
    expect(screen.getByText('Build a safety net')).toBeInTheDocument();
  });

  it('can be skipped entirely', () => {
    const { location } = renderAt('/start');
    fireEvent.click(screen.getByRole('button', { name: /skip to my plan/i }));
    expect(location.current.pathname).toBe('/plan');
  });
});

describe('statements', () => {
  it('shows exactly what will be sent, then the analysis and fixes', async () => {
    categorizeTransactions.mockResolvedValue({ 7: 'dining' });
    renderAt('/plan');

    fireEvent.change(screen.getByLabelText('Choose a statement'), { target: { files: [csvFile()] } });

    const sent = await screen.findByRole('list', { name: 'What will be sent' });
    expect(within(sent).getAllByRole('listitem')).toHaveLength(1);
    expect(within(sent).getByText('NEIGHBOURHOOD THING 4412')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /sort and analyze/i }));

    expect(await screen.findByRole('article', { name: 'Where it went' })).toBeInTheDocument();
    expect(categorizeTransactions).toHaveBeenCalledWith([{ id: 7, description: 'NEIGHBOURHOOD THING 4412', amount: 19 }]);
    const fixes = screen.getByRole('article', { name: 'Easy fixes' });
    expect(within(fixes).getByText('Halve the delivery orders')).toBeInTheDocument();

    // The monthly totals become expense rows marked as coming from the statement.
    const variable = storedProfile().expenses.variable;
    expect(variable).toEqual(expect.arrayContaining([expect.objectContaining({ category: 'dining', source: 'statement' })]));
    expect(JSON.parse(window.localStorage.getItem(STATEMENT_KEY)).transactions).toHaveLength(8);
  });

  it('skips review when every merchant is known on the device', async () => {
    renderAt('/plan');
    const known = CSV.split('\n').filter((line) => !/NEIGHBOURHOOD/.test(line)).join('\n');

    fireEvent.change(screen.getByLabelText('Choose a statement'), { target: { files: [csvFile(known)] } });

    expect(await screen.findByRole('article', { name: 'Where it went' })).toBeInTheDocument();
    expect(categorizeTransactions).not.toHaveBeenCalled();
  });

  it('still analyses when sorting fails, and says so', async () => {
    categorizeTransactions.mockRejectedValue(new Error('rate limited'));
    renderAt('/plan');

    fireEvent.change(screen.getByLabelText('Choose a statement'), { target: { files: [csvFile()] } });
    fireEvent.click(await screen.findByRole('button', { name: /sort and analyze/i }));

    expect(await screen.findByText(/couldn't sort 1 of the transactions/i)).toBeInTheDocument();
  });

  it('explains a file it cannot use', async () => {
    renderAt('/plan');
    fireEvent.change(screen.getByLabelText('Choose a statement'), {
      target: { files: [new File(['x'], 'photo.png', { type: 'image/png' })] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(/photos aren't supported yet/i);
  });

  it('can be removed, taking its expense rows with it', async () => {
    renderAt('/plan');
    const known = CSV.split('\n').filter((line) => !/NEIGHBOURHOOD/.test(line)).join('\n');
    fireEvent.change(screen.getByLabelText('Choose a statement'), { target: { files: [csvFile(known)] } });
    await screen.findByRole('article', { name: 'Where it went' });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: /remove statement/i }));

    await waitFor(() => expect(window.localStorage.getItem(STATEMENT_KEY)).toBeNull());
    expect(storedProfile().expenses.variable.filter((row) => row.source === 'statement')).toEqual([]);
  });
});

describe('the conversation outlives the route', () => {
  it('keeps the thread and a half-typed question across a trip to the landing page', async () => {
    const { location, navigate } = renderAt('/plan');
    fireEvent.change(screen.getByPlaceholderText(/Ask me about saving money/), {
      target: { value: 'draft question' },
    });

    act(() => navigate.current('/'));
    expect(await screen.findByRole('heading', { level: 1, name: /money, minus the dread/i })).toBeInTheDocument();

    act(() => navigate.current('/plan'));
    expect(location.current.pathname).toBe('/plan');
    expect(screen.getAllByText(GREETING)).toHaveLength(1);
    expect(screen.getByPlaceholderText(/Ask me about saving money/)).toHaveValue('draft question');
  });
});
