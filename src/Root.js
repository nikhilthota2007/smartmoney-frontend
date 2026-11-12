import React, { Suspense, lazy, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import '@fontsource-variable/hanken-grotesk';
import './index.css';
import { ProfileProvider } from './context/ProfileContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChatSessionProvider, openConversation, useChatSession } from './app/ChatSession';
import { StatementProvider } from './app/StatementContext';
import Onboarding from './components/onboarding/Onboarding';
import IntakeWizard from './components/intake/IntakeWizard';
import ChatWindow from './components/chat/ChatWindow';

// The landing page carries the animation library; app screens never load it.
const Landing = lazy(() => import('./components/landing/Landing'));

const TITLES = {
  '/': 'SmartMoney: money, minus the dread',
  '/start': 'Get started · SmartMoney',
  '/plan': 'Your plan · SmartMoney',
  '/numbers': 'Your numbers · SmartMoney',
};

/** New page, new title, top of the page. */
const RouteEffects = () => {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo?.(0, 0);
  }, [pathname]);
  useEffect(() => {
    if (TITLES[pathname]) document.title = TITLES[pathname];
  }, [pathname]);
  return null;
};

/** Three questions, then the plan. */
const StartRoute = () => {
  const navigate = useNavigate();
  return <Onboarding onFinish={() => navigate('/plan')} />;
};

/** The detailed editor: every income, expense, debt, account and goal. */
const NumbersRoute = () => {
  const navigate = useNavigate();
  return <IntakeWizard onFinish={() => navigate('/plan')} />;
};

const PlanRoute = () => {
  const chat = useChatSession();
  const navigate = useNavigate();

  // Arriving here by URL counts as opening the conversation.
  useEffect(() => {
    openConversation(chat);
  }, [chat]);

  return <ChatWindow chat={chat} onEditFinances={() => navigate('/numbers')} />;
};

/** The routes on their own, so tests can mount them in a MemoryRouter. */
export const AppRoutes = () => (
  <>
    <RouteEffects />
    <Routes>
      <Route
        path="/"
        element={
          <Suspense fallback={<div className="route-loading" aria-busy="true" />}>
            <Landing />
          </Suspense>
        }
      />
      <Route path="/start" element={<StartRoute />} />
      <Route path="/plan" element={<PlanRoute />} />
      <Route path="/numbers" element={<NumbersRoute />} />
      {/* The plan used to live at /advisor. */}
      <Route path="/advisor" element={<Navigate to="/plan" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </>
);

export const AppProviders = ({ children }) => (
  <ThemeProvider>
    <ProfileProvider>
      <StatementProvider>
        <ChatSessionProvider>{children}</ChatSessionProvider>
      </StatementProvider>
    </ProfileProvider>
  </ThemeProvider>
);

/** React Router 7 behaviours, adopted now so the upgrade is a no-op. */
export const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true };

export default function Root() {
  return (
    <AppProviders>
      <BrowserRouter future={ROUTER_FUTURE}>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}
