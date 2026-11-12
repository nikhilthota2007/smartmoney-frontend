import React, { useState } from 'react';
import '@fontsource-variable/hanken-grotesk';
import './index.css';
import { ProfileProvider } from './context/ProfileContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChatSessionProvider, openConversation, useChatSession } from './app/ChatSession';
import { StatementProvider } from './app/StatementContext';
import IntakeWizard from './components/intake/IntakeWizard';
import ChatWindow from './components/chat/ChatWindow';

/**
 * The wizard and the advisor, switched by state.
 *
 * This is the app without a router: it opens straight on the wizard. Root.js
 * wraps the same screens in routes and adds the landing page; this component
 * stays as the router-free contract that src/App.test.js exercises.
 */
const AdvisorScreens = () => {
  const chat = useChatSession();
  const [showChat, setShowChat] = useState(false);

  const startChat = () => {
    openConversation(chat);
    setShowChat(true);
  };

  return showChat ? (
    <ChatWindow chat={chat} onEditFinances={() => setShowChat(false)} />
  ) : (
    <IntakeWizard onFinish={startChat} />
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ProfileProvider>
        <StatementProvider>
          <ChatSessionProvider>
            <AdvisorScreens />
          </ChatSessionProvider>
        </StatementProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}
