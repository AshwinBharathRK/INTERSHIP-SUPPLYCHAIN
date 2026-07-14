import React from "react";
import { NavLink } from "react-router-dom";
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
  Activity,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const NAV = [
  { to: "/dashboard", label: "Command Center", icon: LayoutDashboard, testId: "nav-command-center" },
  { to: "/map", label: "Network Map", icon: Globe2, testId: "nav-network-map" },
  { to: "/warehouse", label: "3D Warehouse", icon: Warehouse, testId: "nav-warehouse" },
  { to: "/inventory", label: "Inventory", icon: Package, testId: "nav-inventory" },
  { to: "/forecasting", label: "Forecasting", icon: TrendingUp, testId: "nav-forecasting" },
  { to: "/suppliers", label: "Suppliers", icon: Factory, testId: "nav-suppliers" },
  { to: "/shipments", label: "Shipments", icon: Ship, testId: "nav-shipments" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, testId: "nav-analytics" },
  { to: "/copilot", label: "AI Copilot", icon: Sparkles, testId: "nav-copilot" },
  { to: "/simulation", label: "Simulation Room", icon: Activity, testId: "nav-simulation" },
];

export const LeftRail = () => {
  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className="z-20 flex h-full w-[64px] shrink-0 flex-col border-r border-[hsl(var(--stroke-soft)/0.6)] bg-[hsl(var(--surface-1))] lg:w-[224px]"
        data-testid="left-rail-nav"
      >
        <div className="flex h-14 items-center gap-2.5 px-4 md:h-16">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.14)] ring-1 ring-[hsl(var(--primary)/0.35)]">
            <Globe2 className="h-4.5 w-4.5 text-[hsl(var(--primary))]" size={18} />
            <span className="live-dot absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
          </div>
          <div className="hidden lg:block">
            <div className="font-display text-sm font-semibold leading-tight tracking-tight">AURORA FORGE</div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Digital Twin</div>
          </div>
        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-1 px-2.5">
          {NAV.map(({ to, label, icon: Icon, testId }) => (
            <Tooltip key={to}>
              <TooltipTrigger asChild>
                <NavLink
                  to={to}
                  end={to === "/"}
                  data-testid={testId}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-[background-color,color] duration-200 ${
                      isActive
                        ? "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]"
                        : "text-muted-foreground hover:bg-[hsl(var(--surface-2))] hover:text-foreground"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-[hsl(var(--primary))] shadow-[0_0_12px_hsl(var(--primary)/0.8)]" />
                      )}
                      <Icon size={18} className="shrink-0" />
                      <span className="hidden truncate lg:inline">{label}</span>
                    </>
                  )}
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" className="lg:hidden">
                {label}
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>

        <div className="px-4 py-4">
          <div className="hidden items-center gap-2 rounded-lg border border-[hsl(var(--stroke-soft)/0.5)] bg-[hsl(var(--surface-2)/0.6)] px-3 py-2 lg:flex">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
            <span className="text-[11px] text-muted-foreground">Live simulation</span>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
};
