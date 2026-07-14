import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Globe2,
  Warehouse,
  Package,
  TrendingUp,
  Factory,
  Ship,
  BarChart3,
  Sparkles,
  Play,
  Download,
  Activity,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useApp } from "@/context/AppContext";
import { exportUrl } from "@/lib/api";

export const CommandPalette = () => {
  const navigate = useNavigate();
  const { paletteOpen, setPaletteOpen, toggleSim, setCopilotOpen } = useApp();

  useEffect(() => {
    const down = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setPaletteOpen]);

  const run = (fn) => {
    fn();
    setPaletteOpen(false);
  };

  const pages = [
    { label: "Command Center", icon: LayoutDashboard, to: "/" },
    { label: "Network Map", icon: Globe2, to: "/map" },
    { label: "3D Warehouse", icon: Warehouse, to: "/warehouse" },
    { label: "Inventory", icon: Package, to: "/inventory" },
    { label: "Forecasting", icon: TrendingUp, to: "/forecasting" },
    { label: "Suppliers", icon: Factory, to: "/suppliers" },
    { label: "Shipments", icon: Ship, to: "/shipments" },
    { label: "Analytics", icon: BarChart3, to: "/analytics" },
    { label: "AI Copilot", icon: Sparkles, to: "/copilot" },
    { label: "Simulation Room", icon: Activity, to: "/simulation" },
  ];

  return (
    <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen} data-testid="global-command-palette">
      <CommandInput placeholder="Navigate, act, export..." data-testid="command-palette-input" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {pages.map((p) => (
            <CommandItem key={p.to} onSelect={() => run(() => navigate(p.to))} data-testid={`palette-nav-${p.label.toLowerCase().replace(/\s/g, "-")}`}>
              <p.icon size={15} className="mr-2 text-muted-foreground" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(toggleSim)} data-testid="palette-toggle-sim">
            <Play size={15} className="mr-2 text-muted-foreground" />
            Play / pause simulation
          </CommandItem>
          <CommandItem onSelect={() => run(() => setCopilotOpen(true))} data-testid="palette-open-copilot">
            <Sparkles size={15} className="mr-2 text-muted-foreground" />
            Ask AI Copilot
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Export">
          {["inventory", "shipments", "suppliers", "events"].map((k) => (
            <CommandItem key={k} onSelect={() => run(() => window.open(exportUrl(k), "_blank"))} data-testid={`palette-export-${k}`}>
              <Download size={15} className="mr-2 text-muted-foreground" />
              Export {k} CSV
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
