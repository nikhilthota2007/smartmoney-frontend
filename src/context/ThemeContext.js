import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadDarkMode, saveDarkMode } from '../lib/storage';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(loadDarkMode);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  const value = useMemo(
    () => ({
      darkMode,
      toggleDarkMode: () =>
        setDarkMode((previous) => {
          saveDarkMode(!previous);
          return !previous;
        }),
    }),
    [darkMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside a ThemeProvider');
  return context;
};
