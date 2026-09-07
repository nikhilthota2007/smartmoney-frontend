import React, { useState } from 'react';
import './index.css';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import { ThemeProvider } from './context/ThemeContext';
import { useChat } from './hooks/useChat';
import IntakeForm from './components/intake/IntakeForm';
import ChatWindow from './components/chat/ChatWindow';

const AdvisorScreens = () => {
  const { financialData } = useProfile();
  const chat = useChat(financialData);
  const [showChat, setShowChat] = useState(false);

  const startChat = () => {
    chat.startConversation();
    setShowChat(true);
  };

  return showChat ? <ChatWindow chat={chat} /> : <IntakeForm onStart={startChat} />;
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
