import React, { Suspense, lazy, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import '@fontsource-variable/hanken-grotesk';
import './index.css';
import { ProfileProvider } from './context/ProfileContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChatSessionProvider, openConversation, useChatSession } from './app/ChatSession';
import IntakeWizard from './components/intake/IntakeWizard';
import ChatWindow from './components/chat/ChatWindow';

// The landing page carries the animation library; app screens never load it.
const Landing = lazy(() => import('./components/landing/Landing'));

const TITLES = {
  '/': 'SmartMoney: money, minus the dread',
  '/start': 'Your numbers · SmartMoney',
  '/advisor': 'Your advisor · SmartMoney',
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

const StartRoute = () => {
  const navigate = useNavigate();
  return <IntakeWizard onFinish={() => navigate('/advisor')} />;
};

const AdvisorRoute = () => {
  const chat = useChatSession();
  const navigate = useNavigate();

  // Arriving here by URL counts as opening the conversation.
  useEffect(() => {
    openConversation(chat);
  }, [chat]);

  return <ChatWindow chat={chat} onEditFinances={() => navigate('/start')} />;
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
      <Route path="/advisor" element={<AdvisorRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </>
);

export const AppProviders = ({ children }) => (
  <ThemeProvider>
    <ProfileProvider>
      <ChatSessionProvider>{children}</ChatSessionProvider>
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
