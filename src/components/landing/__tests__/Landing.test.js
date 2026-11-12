import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from '../Landing';
import { buildDemo, DEMO_EXTRA } from '../demo';
import { money, monthLabel } from '../../cards/display';
import { AppProviders, ROUTER_FUTURE } from '../../../Root';
import { PROFILE_KEY } from '../../../lib/storage';

const renderLanding = () =>
  render(
    <AppProviders>
      <MemoryRouter future={ROUTER_FUTURE}>
        <Landing />
      </MemoryRouter>
    </AppProviders>
  );

beforeEach(() => window.localStorage.clear());

describe('landing page, finished state', () => {
  it('renders without motion when the browser cannot animate', () => {
    renderLanding();
    expect(screen.getByTestId('landing')).toHaveAttribute('data-motion', 'off');
  });

  it('has the hero headline and the section 2 claim', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 1, name: 'Money, minus the dread.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Honest math. Zero judgment.' })).toBeInTheDocument();
  });

  it('quotes figures the planner calculated for the demo profile', () => {
    const demo = buildDemo();
    renderLanding();

    expect(demo.script.question).toBe('I owe $6,400 on two cards. Help.');
    expect(screen.getByText(/someone with \$6,400 on two cards/)).toHaveTextContent(
      `debt-free by ${monthLabel(demo.payoff.avalanche.months)}, ${demo.payoff.comparedToMinimumsOnly.monthsSaved} months sooner, with ${money(demo.payoff.comparedToMinimumsOnly.interestSaved)} less interest`
    );
    expect(demo.payoff.extraPayment).toBe(DEMO_EXTRA);
  });

  it('shows the finished payoff card on the phone', () => {
    const demo = buildDemo();
    renderLanding();
    // The phone is decorative to assistive tech, hence hidden: true.
    const card = within(screen.getByRole('article', { name: 'Payoff plan', hidden: true }));

    expect(card.getByText(monthLabel(demo.payoff.avalanche.months))).toBeInTheDocument();
    expect(card.getByText(money(demo.payoff.comparedToMinimumsOnly.interestSaved))).toBeInTheDocument();
  });

  it('sends new visitors to the wizard', () => {
    renderLanding();
    screen.getAllByRole('link', { name: /get my plan/i }).forEach((link) => {
      expect(link).toHaveAttribute('href', '/start');
    });
  });

  it('sends returning visitors straight to their plan', () => {
    window.localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({ schemaVersion: 2, income: [{ id: 1, source: 'Pay', netMonthly: '3000', stability: 'stable' }] })
    );
    renderLanding();
    expect(screen.getByRole('link', { name: /open my plan/i })).toHaveAttribute('href', '/advisor');
  });
});

describe('landing page, animated', () => {
  const originals = {};

  beforeEach(() => {
    originals.matchMedia = window.matchMedia;
    originals.IntersectionObserver = window.IntersectionObserver;
    originals.ResizeObserver = window.ResizeObserver;
    window.matchMedia = (query) => ({
      matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
    });
    window.IntersectionObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
    window.ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
  });

  afterEach(() => {
    Object.assign(window, originals);
  });

  it('turns motion on and tears it down cleanly', () => {
    const { unmount } = renderLanding();
    expect(screen.getByTestId('landing')).toHaveAttribute('data-motion', 'on');
    // The phone's words start hidden until the sequence plays.
    expect(screen.getByText('Okay.')).toHaveStyle({ opacity: '0' });
    unmount();
  });

  it('respects a reduced-motion preference', () => {
    window.matchMedia = (query) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} });
    renderLanding();
    expect(screen.getByTestId('landing')).toHaveAttribute('data-motion', 'off');
  });
});
