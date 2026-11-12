import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { AppProviders, AppRoutes, ROUTER_FUTURE } from './Root';

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

const GREETING = /I've got your numbers in front of me/;

beforeEach(() => {
  window.localStorage.clear();
  window.scrollTo = jest.fn();
});

describe('routes', () => {
  it('serves the landing page at /', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: /money, minus the dread/i })).toBeInTheDocument();
  });

  it('goes from the landing page to the wizard', async () => {
    const { location } = renderAt('/');
    fireEvent.click((await screen.findAllByRole('link', { name: /get my plan/i }))[0]);

    expect(location.current.pathname).toBe('/start');
    expect(screen.getByText(/% complete/)).toBeInTheDocument();
  });

  it('serves the wizard at /start and finishing it opens the advisor', () => {
    const { location } = renderAt('/start');
    fireEvent.click(screen.getByRole('button', { name: /skip the rest and start asking questions/i }));

    expect(location.current.pathname).toBe('/advisor');
    expect(screen.getByText(GREETING)).toBeInTheDocument();
  });

  it('greets once when /advisor is opened directly', () => {
    renderAt('/advisor');
    expect(screen.getAllByText(GREETING)).toHaveLength(1);
  });

  it('sends My Finances back to /start', () => {
    const { location } = renderAt('/advisor');
    fireEvent.click(screen.getByRole('button', { name: /my finances/i }));

    expect(location.current.pathname).toBe('/start');
  });

  it('redirects an unknown path to the landing page', async () => {
    const { location } = renderAt('/nope');
    expect(location.current.pathname).toBe('/');
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('sets a page title per route', () => {
    renderAt('/start');
    expect(document.title).toMatch(/your numbers/i);
  });
});

describe('the conversation outlives the route', () => {
  it('keeps the thread and a half-typed question across a trip to the landing page', async () => {
    const { location, navigate } = renderAt('/advisor');
    fireEvent.change(screen.getByPlaceholderText(/Ask me about saving money/), {
      target: { value: 'draft question' },
    });

    act(() => navigate.current('/'));
    expect(await screen.findByRole('heading', { level: 1, name: /money, minus the dread/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Ask me about saving money/)).not.toBeInTheDocument();

    act(() => navigate.current('/advisor'));
    expect(location.current.pathname).toBe('/advisor');
    expect(screen.getAllByText(GREETING)).toHaveLength(1);
    expect(screen.getByPlaceholderText(/Ask me about saving money/)).toHaveValue('draft question');
  });
});
