import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Play, Pause, Search, Sparkles, Clock, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/context/AppContext";
import { fmtSimClock } from "@/lib/format";
import { THEMES } from "@/lib/theme";

const TITLES = {
  "/dashboard": "Operations Command Center",
  "/map": "Global Network Map",
  "/warehouse": "3D Warehouse Twin",
  "/inventory": "Inventory & Optimization",
  "/forecasting": "Demand Forecasting",
  "/suppliers": "Suppliers & Risk",
  "/shipments": "Shipments & Logistics",
  "/analytics": "Analytics Studio",
  "/copilot": "AI Copilot",
};

const SPEEDS = [
  { value: 360, label: "6 h / min" },
  { value: 1440, label: "1 day / min" },
  { value: 4320, label: "3 days / min" },
];

export const TopBar = () => {
  const location = useLocation();
  const { simState, toggleSim, setSimSpeed, setPaletteOpen, setCopilotOpen, theme, switchTheme } = useApp();
  const [clock, setClock] = useState(null);
  const baseRef = useRef({ wall: Date.now(), sim: null, speed: 1440, running: true });

  useEffect(() => {
    if (simState?.sim_time) {
      baseRef.current = {
        wall: Date.now(),
        sim: new Date(simState.sim_time).getTime(),
        speed: simState.speed || 1440,
        running: !!simState.running,
      };
      setClock(simState.sim_time);
    }
  }, [simState]);

  useEffect(() => {
    const t = setInterval(() => {
      const b = baseRef.current;
      if (!b.sim || !b.running) return;
      const elapsed = Date.now() - b.wall;
      setClock(new Date(b.sim + elapsed * b.speed).toISOString());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const running = simState?.running;

  return (
    <header className="z-20 flex h-14 shrink-0 items-center gap-2 border-b border-[hsl(var(--stroke-soft)/0.6)] bg-[hsl(var(--surface-1)/0.85)] px-3 backdrop-blur-md md:h-16 md:gap-3 md:px-5">
      <h1 className="font-display min-w-0 flex-1 truncate text-base font-semibold tracking-tight md:text-lg" data-testid="page-title">
        {TITLES[location.pathname] || "Aurora Forge"}
      </h1>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setPaletteOpen(true)}
        data-testid="global-search-button"
        className="hidden h-8 gap-2 border-[hsl(var(--stroke-soft))] bg-[hsl(var(--surface-2)/0.5)] text-muted-foreground hover:text-foreground md:flex"
      >
        <Search size={14} />
        <span className="text-xs">Search</span>
        <kbd className="font-mono rounded border border-[hsl(var(--stroke-soft))] bg-[hsl(var(--surface-1))] px-1.5 py-0.5 text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </Button>

      <div className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--stroke-soft)/0.6)] bg-[hsl(var(--surface-2)/0.5)] px-1.5 py-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSim}
          data-testid="sim-play-toggle"
          className="h-7 w-7 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.12)]"
          title={running ? "Pause simulation" : "Resume simulation"}
        >
          {running ? <Pause size={14} /> : <Play size={14} />}
        </Button>
        <Select value={String(simState?.speed || 1440)} onValueChange={(v) => setSimSpeed(Number(v))}>
          <SelectTrigger
            className="h-7 w-[110px] border-none bg-transparent text-xs text-muted-foreground focus:ring-0"
            data-testid="sim-speed-select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPEEDS.map((s) => (
              <SelectItem key={s.value} value={String(s.value)} data-testid={`sim-speed-${s.value}`}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="hidden items-center gap-1.5 border-l border-[hsl(var(--stroke-soft)/0.6)] pl-2 pr-1 sm:flex">
          <Clock size={12} className={running ? "text-[hsl(var(--success))]" : "text-muted-foreground"} />
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground" data-testid="sim-clock">
            {fmtSimClock(clock)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 border-l border-[hsl(var(--stroke-soft)/0.6)] pl-2 pr-1">
        <Palette size={13} className="text-muted-foreground" />
        <Select value={theme} onValueChange={switchTheme}>
          <SelectTrigger
            className="h-7 w-[120px] border-none bg-transparent text-xs font-semibold text-muted-foreground focus:ring-0 hover:text-foreground"
            data-testid="theme-select"
          >
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(THEMES).map(([key, t]) => (
              <SelectItem key={key} value={key} data-testid={`theme-option-${key}`}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        size="sm"
        onClick={() => setCopilotOpen(true)}
        data-testid="open-copilot-button"
        className="h-8 gap-1.5 bg-[hsl(var(--primary)/0.14)] text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary)/0.35)] hover:bg-[hsl(var(--primary)/0.22)]"
      >
        <Sparkles size={14} />
        <span className="hidden sm:inline">Copilot</span>
      </Button>
    </header>
  );
};
