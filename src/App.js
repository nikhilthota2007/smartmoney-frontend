import React, { useState } from 'react';
import './index.css';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import { ThemeProvider } from './context/ThemeContext';
import { useChat } from './hooks/useChat';
import IntakeWizard from './components/intake/IntakeWizard';
import ChatWindow from './components/chat/ChatWindow';

const AdvisorScreens = () => {
  const { financialData } = useProfile();
  const chat = useChat(financialData);
  const [showChat, setShowChat] = useState(false);

  const startChat = () => {
    // Only greet on a fresh conversation — coming back from editing finances
    // must not discard what has already been said.
    if (chat.messages.length === 0) chat.startConversation();
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
        <AdvisorScreens />
      </ProfileProvider>
    </ThemeProvider>
  );
}
