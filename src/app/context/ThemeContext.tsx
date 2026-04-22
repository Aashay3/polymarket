"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "nexora.theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {}
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (t === "dark") {
    html.classList.add("dark");
    html.classList.remove("light");
  } else {
    html.classList.remove("dark");
    html.classList.add("light");
  }
  html.style.colorScheme = t;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
