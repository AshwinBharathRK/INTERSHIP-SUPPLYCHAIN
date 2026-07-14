import React, { useEffect, useState, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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

const NAV_ITEMS = [
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

const AUTO_HIDE_ROUTES = ["/map", "/warehouse"];

export const FloatingDock = () => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const idleTimeoutRef = useRef(null);

  const shouldAutoHide = AUTO_HIDE_ROUTES.includes(location.pathname);

  useEffect(() => {
    if (!shouldAutoHide) {
      setIsVisible(true);
      return;
    }

    const resetIdleTimer = () => {
      setIsVisible(true);
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      idleTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 3000); // Hide dock after 3 seconds of mouse inactivity
    };

    window.addEventListener("mousemove", resetIdleTimer);
    window.addEventListener("mousedown", resetIdleTimer);
    resetIdleTimer();

    return () => {
      window.removeEventListener("mousemove", resetIdleTimer);
      window.removeEventListener("mousedown", resetIdleTimer);
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [shouldAutoHide, location.pathname]);

  return (
    <TooltipProvider delayDuration={100}>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 80, x: "-50%", opacity: 0 }}
            animate={{ y: 0, x: "-50%", opacity: 1 }}
            exit={{ y: 80, x: "-50%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed bottom-4 left-1/2 z-50 flex items-center gap-2 rounded-2xl border border-[hsl(var(--stroke-soft)/0.8)] bg-[hsl(var(--surface-1)/0.75)] px-4 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.55),_0_0_10px_hsl(var(--primary)/0.15)] backdrop-blur-xl md:bottom-6 md:gap-3 before:absolute before:inset-0 before:rounded-2xl before:pointer-events-none before:bg-[linear-gradient(110deg,rgba(255,255,255,0.06),transparent_45%,rgba(0,0,0,0.12))]"
            data-testid="floating-dock"
          >
            {NAV_ITEMS.map(({ to, label, icon: Icon, testId }) => {
              const isActive = location.pathname === to;
              return (
                <Tooltip key={to}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={to}
                      data-testid={testId}
                      className="relative"
                    >
                      <motion.div
                        whileHover={{ y: -6, scale: 1.15 }}
                        whileTap={{ scale: 0.92 }}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-[color,background-color,border-color,box-shadow] duration-200 md:h-11 md:w-11 ${
                          isActive
                            ? "bg-[hsl(var(--primary)/0.16)] text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary)/0.4)] shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                            : "text-muted-foreground hover:bg-[hsl(var(--surface-2))] hover:text-foreground"
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="active-indicator"
                            className="absolute -bottom-1 h-1 w-4 rounded-full bg-[hsl(var(--primary))] shadow-[0_0_8px_hsl(var(--primary)),_0_0_16px_hsl(var(--primary)/0.6)]"
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                          />
                        )}
                        <Icon size={20} className="shrink-0" />
                      </motion.div>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="border-[hsl(var(--stroke-soft))] bg-[hsl(var(--surface-2))] text-[11px] font-display font-medium text-foreground">
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
};
