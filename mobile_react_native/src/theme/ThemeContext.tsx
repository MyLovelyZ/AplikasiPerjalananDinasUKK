import React, { createContext, useContext, useState } from 'react';
import { LightThemeColors, DarkThemeColors, Radii, setDarkMode } from './colors';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: typeof LightThemeColors;
  radii: typeof Radii;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  isDark: false,
  colors: LightThemeColors,
  radii: Radii,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('light');

  const isDark = theme === 'dark';
  const colors = isDark ? DarkThemeColors : LightThemeColors;

  const toggleTheme = () => {
    const next: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setThemeState(next);
    setDarkMode(next === 'dark');
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    setDarkMode(mode === 'dark');
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        colors,
        radii: Radii,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
