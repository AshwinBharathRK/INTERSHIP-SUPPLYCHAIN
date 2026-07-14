import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TopBar } from "@/components/shell/TopBar";
import { FloatingDock } from "@/components/shell/FloatingDock";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { CopilotDrawer } from "@/components/copilot/CopilotDrawer";

const FULL_BLEED = ["/map", "/warehouse", "/simulation"];

export const AppShell = () => {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const isSimulation = location.pathname === "/simulation";
  const fullBleed = FULL_BLEED.includes(location.pathname) || isLanding || isSimulation;

  if (isLanding || isSimulation) {
    return (
      <div className="relative h-screen w-full overflow-hidden bg-background text-foreground" data-testid="app-shell">
        <main className="h-full w-full">
          <Outlet />
        </main>
        <CommandPalette />
        <CopilotDrawer />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground" data-testid="app-shell">
      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-20">
        <TopBar />
        <main className={`relative min-h-0 flex-1 ${fullBleed ? "overflow-hidden" : "overflow-y-auto"}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.99 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={fullBleed ? "h-full" : "px-4 py-4 md:px-6 md:py-6 lg:px-8"}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <FloatingDock />
      <CommandPalette />
      <CopilotDrawer />
    </div>
  );
};
