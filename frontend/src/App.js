import React, { lazy, Suspense } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AppProvider } from "@/context/AppContext";
import { AppShell } from "@/components/shell/AppShell";
import { PageLoader } from "@/components/common/LoadingState";
import { Toaster } from "@/components/ui/sonner";

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const CommandCenter = lazy(() => import("@/pages/CommandCenter"));
const NetworkMap = lazy(() => import("@/pages/NetworkMap"));
const WarehouseTwin = lazy(() => import("@/pages/WarehouseTwin"));
const Inventory = lazy(() => import("@/pages/Inventory"));
const Forecasting = lazy(() => import("@/pages/Forecasting"));
const Suppliers = lazy(() => import("@/pages/Suppliers"));
const Shipments = lazy(() => import("@/pages/Shipments"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Copilot = lazy(() => import("@/pages/Copilot"));
const Simulation = lazy(() => import("@/pages/Simulation"));

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route
                path="/"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <LandingPage />
                  </Suspense>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <CommandCenter />
                  </Suspense>
                }
              />
              <Route
                path="/map"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <NetworkMap />
                  </Suspense>
                }
              />
              <Route
                path="/warehouse"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <WarehouseTwin />
                  </Suspense>
                }
              />
              <Route
                path="/inventory"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Inventory />
                  </Suspense>
                }
              />
              <Route
                path="/forecasting"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Forecasting />
                  </Suspense>
                }
              />
              <Route
                path="/suppliers"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Suppliers />
                  </Suspense>
                }
              />
              <Route
                path="/shipments"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Shipments />
                  </Suspense>
                }
              />
              <Route
                path="/analytics"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Analytics />
                  </Suspense>
                }
              />
              <Route
                path="/copilot"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Copilot />
                  </Suspense>
                }
              />
              <Route
                path="/simulation"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Simulation />
                  </Suspense>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" theme="dark" />
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
