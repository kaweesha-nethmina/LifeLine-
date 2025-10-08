import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme Context
const ThemeContext = createContext();

// Theme definitions
export const THEMES = {
  LIGHT: {
    PRIMARY: '#2E86AB',
    PRIMARYB: '#026932ff',
    SECONDARY: '#A23B72',
    ACCENT: '#F18F01',
    SUCCESS: '#4CAF50',
    ERROR: '#F44336',
    WARNING: '#FF9800',
    INFO: '#2196F3',
    WHITE: '#FFFFFF',
    BLACK: '#000000',
    GRAY_LIGHT: '#F5F5F5',
    GRAY_MEDIUM: '#9E9E9E',
    GRAY_DARK: '#424242',
    EMERGENCY: '#E53E3E',
    EMERGENCY_LIGHT: '#FED7D7',
    BACKGROUND: '#F8F9FA',
    CARD_BACKGROUND: '#FFFFFF',
    BORDER: '#E2E8F0',
    TEXT_PRIMARY: '#2D3748',
    TEXT_SECONDARY: '#718096',
    OVERLAY: 'rgba(0, 0, 0, 0.5)'
  },
  DARK: {
    PRIMARY: '#4DB6E5',
    PRIMARYB: '#02C75A',
    SECONDARY: '#C25B92',
    ACCENT: '#FFA726',
    SUCCESS: '#66BB6A',
    ERROR: '#EF5350',
    WARNING: '#FFA726',
    INFO: '#42A5F5',
    WHITE: '#121212',
    BLACK: '#FFFFFF',
    GRAY_LIGHT: '#2A2A2A',
    GRAY_MEDIUM: '#757575',
    GRAY_DARK: '#BDBDBD',
    EMERGENCY: '#FF6B6B',
    EMERGENCY_LIGHT: '#FF8A80',
    BACKGROUND: '#121212',
    CARD_BACKGROUND: '#1E1E1E',
    BORDER: '#424242',
    TEXT_PRIMARY: '#E0E0E0',
    TEXT_SECONDARY: '#B0B0B0',
    OVERLAY: 'rgba(255, 255, 255, 0.3)'
  }
};

// Theme Provider Component
export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [theme, setTheme] = useState(THEMES.LIGHT);

  // Load theme preference from storage
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('themePreference');
        if (savedTheme !== null) {
          const isDark = savedTheme === 'dark';
          setIsDarkMode(isDark);
          setTheme(isDark ? THEMES.DARK : THEMES.LIGHT);
        } else {
          // Use system preference if no saved preference
          const systemTheme = Appearance.getColorScheme();
          const isDark = systemTheme === 'dark';
          setIsDarkMode(isDark);
          setTheme(isDark ? THEMES.DARK : THEMES.LIGHT);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };

    loadThemePreference();
  }, []);

  // Save theme preference to storage
  const toggleTheme = async () => {
    try {
      const newIsDarkMode = !isDarkMode;
      setIsDarkMode(newIsDarkMode);
      setTheme(newIsDarkMode ? THEMES.DARK : THEMES.LIGHT);
      await AsyncStorage.setItem('themePreference', newIsDarkMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const value = {
    isDarkMode,
    theme,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};