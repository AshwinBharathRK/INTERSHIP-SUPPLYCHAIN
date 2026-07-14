import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchers } from "@/lib/api";
import { THEMES, getActiveThemeKey, setActiveThemeKey } from "@/lib/theme";

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [theme, setThemeState] = useState(() => getActiveThemeKey());
  const qc = useQueryClient();

  const switchTheme = useCallback((newTheme) => {
    if (!THEMES[newTheme]) return;
    
    // Remove all theme classes
    Object.values(THEMES).forEach((t) => {
      if (t.className) {
        document.documentElement.classList.remove(t.className);
      }
    });
    
    // Add new theme class if applicable
    const themeConfig = THEMES[newTheme];
    if (themeConfig.className) {
      document.documentElement.classList.add(themeConfig.className);
    }
    
    setActiveThemeKey(newTheme);
    setThemeState(newTheme);
  }, []);

  // Sync theme to DOM on mount
  useEffect(() => {
    const active = getActiveThemeKey();
    const themeConfig = THEMES[active];
    if (themeConfig && themeConfig.className) {
      document.documentElement.classList.add(themeConfig.className);
    }
  }, []);

  const { data: simState } = useQuery({
    queryKey: ["simState"],
    queryFn: fetchers.simState,
    refetchInterval: 5000,
  });

  const toggleSim = useMutation({
    mutationFn: fetchers.simToggle,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["simState"] }),
  });

  const setSpeed = useMutation({
    mutationFn: fetchers.simSpeed,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["simState"] }),
  });

  const openCopilot = useCallback(() => setCopilotOpen(true), []);

  return (
    <AppContext.Provider
      value={{
        copilotOpen,
        setCopilotOpen,
        openCopilot,
        paletteOpen,
        setPaletteOpen,
        simState,
        toggleSim: () => toggleSim.mutate(),
        setSimSpeed: (s) => setSpeed.mutate(s),
        theme,
        switchTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
