import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const DarkModeToggle = ({ className = 'icon-btn', size = 20 }) => {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <button
      className={className}
      onClick={toggleDarkMode}
      title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {darkMode ? <Sun size={size} aria-hidden="true" /> : <Moon size={size} aria-hidden="true" />}
    </button>
  );
};

export default DarkModeToggle;
