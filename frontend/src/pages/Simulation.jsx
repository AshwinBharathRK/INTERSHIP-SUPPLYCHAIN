import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Canvas } from "@react-three/fiber";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Pause,
  RotateCcw,
  Activity,
  AlertTriangle,
  Coins,
  ShieldAlert,
  Sparkles,
  ArrowLeft,
  Zap,
  CloudLightning,
  Flame,
  Globe,
  Settings,
  Plus,
  ArrowRight,
  TrendingUp,
  Sliders,
  Sparkle,
} from "lucide-react";

import { fetchers } from "@/lib/api";
import { fmtCurrency, fmtNumber } from "@/lib/format";
import { PageLoader } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SimulationEngine } from "./SimulationEngine";
import { SimulationScene } from "./SimulationScene";

export default function Simulation() {
  const navigate = useNavigate();

  // Load baseline static assets from DB
  const { data: nodes, isLoading: nodesLoading } = useQuery({
    queryKey: ["nodes"],
    queryFn: () => fetchers.nodes(),
  });
  const { data: products, isLoading: prodsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: fetchers.products,
  });
  const { data: lanes, isLoading: lanesLoading } = useQuery({
    queryKey: ["lanes"],
    queryFn: fetchers.lanes,
  });

  const loading = nodesLoading || prodsLoading || lanesLoading;

  // Simulation Engine Setup
  const [engine, setEngine] = useState(null);
  const [ticks, setTicks] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [simSpeed, setSimSpeed] = useState("normal"); // slow, normal, fast, max
  const [activeScenario, setActiveScenario] = useState("normal");
  
  // Node selection for Inspector
  const [selectedNode, setSelectedNode] = useState(null);

  // Custom scenario builder state
  const [customModifiers, setCustomModifiers] = useState({
    demandWeight: 1.0,
    supplierReliability: 1.0,
    leadTimeMultiplier: 1.0,
    fuelCostMultiplier: 1.0,
    weatherSeverity: 0.0,
    portCongestion: 0.0,
    routeBlockage: false,
    capacityMultiplier: 1.0,
  });

  // Action Panel fields
  const [actionProduct, setActionProduct] = useState("");
  const [actionQty, setActionQty] = useState(150);
  const [actionDest, setActionDest] = useState("");

  // Initialize engine once data is ready
  useEffect(() => {
    if (nodes && products && lanes && !engine) {
      const eng = new SimulationEngine(nodes, products, lanes);
      eng.init("normal");
      setEngine(eng);
    }
  }, [nodes, products, lanes, engine]);

  // Main simulation tick loop
  useEffect(() => {
    if (!engine || !isRunning) return;

    let intervalTime = 1000;
    let simHoursPerTick = 3.0; // ~3 simulated hours per real second

    if (simSpeed === "slow") {
      intervalTime = 1500;
      simHoursPerTick = 1.0;
    } else if (simSpeed === "fast") {
      intervalTime = 600;
      simHoursPerTick = 9.0;
    } else if (simSpeed === "max") {
      intervalTime = 300;
      simHoursPerTick = 24.0; // 1 full day per 300ms
    }

    const interval = setInterval(() => {
      engine.tick(simHoursPerTick);
      setTicks((t) => t + 1);
    }, intervalTime);

    return () => clearInterval(interval);
  }, [engine, isRunning, simSpeed]);

  // Derived real-time datasets
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const visualData = useMemo(() => engine?.getVisualData(), [engine, ticks]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const kpis = useMemo(() => engine?.getKPIs(), [engine, ticks]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const aiAlerts = useMemo(() => engine?.getAIAlerts(), [engine, ticks]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const historyLogs = useMemo(() => engine?.alerts || [], [engine, ticks]);

  // Sync selected node with real-time updates
  const inspectedNode = useMemo(() => {
    if (!selectedNode || !visualData) return null;
    return visualData.nodes.find((n) => n.id === selectedNode.id) || selectedNode;
  }, [selectedNode, visualData]);

  // Get active inventory rows for inspected warehouse
  const inspectedInventory = useMemo(() => {
    if (!inspectedNode || inspectedNode.node_type !== "warehouse" || !engine) return [];
    return Array.from(engine.inventory.values()).filter(
      (item) => item.warehouse_code === inspectedNode.code
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectedNode, engine, ticks]);

  // Handler to load built-in scenarios
  const handleLoadScenario = (scenKey) => {
    if (!engine) return;
    engine.init(scenKey);
    setActiveScenario(scenKey);
    setSelectedNode(null);
    setTicks((t) => t + 1);
  };

  // Handler for custom scenario sliders
  const handleApplyCustomParams = () => {
    if (!engine) return;
    engine.init("custom", customModifiers);
    setActiveScenario("custom");
    setSelectedNode(null);
    setTicks((t) => t + 1);
  };

  // Actions execution
  const executeEmergencyPurchase = (sku) => {
    if (!engine || !inspectedNode) return;
    engine.applyAction({
      type: "emergency_purchase",
      sku,
      warehouseCode: inspectedNode.code,
    });
    setTicks((t) => t + 1);
  };

  const executeStockTransfer = () => {
    if (!engine || !inspectedNode || !actionProduct || !actionDest) return;
    engine.applyAction({
      type: "stock_transfer",
      sku: actionProduct,
      fromCode: inspectedNode.code,
      toCode: actionDest,
      qty: parseInt(actionQty, 10) || 100,
    });
    // Reset fields
    setActionProduct("");
    setActionDest("");
    setTicks((t) => t + 1);
  };

  const toggleExpediteLane = (laneId) => {
    if (!engine) return;
    engine.applyAction({ type: "expedite", laneId });
    setTicks((t) => t + 1);
  };

  const executeAdjustBuffer = (scale) => {
    if (!engine) return;
    engine.applyAction({ type: "adjust_buffer", scale });
    setTicks((t) => t + 1);
  };

  if (loading || !engine) {
    return <PageLoader />;
  }

  // Generate warehouse codes for Transfer dropdown
  const otherWarehouses = visualData.nodes.filter(
    (n) => n.node_type === "warehouse" && n.code !== inspectedNode?.code
  );

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      
      {/* 3D MAP CANVAS VIEWPORT */}
      <div className="absolute inset-0 z-0 h-full w-full">
        <Canvas camera={{ position: [20, 95, 75], fov: 40 }} dpr={[1, 1.5]}>
          <SimulationScene
            visualData={visualData}
            onSelectNode={setSelectedNode}
            selectedNode={inspectedNode}
          />
        </Canvas>
      </div>

      {/* HEADER CONTROL PANEL */}
      <header className="absolute left-4 right-4 top-4 z-10 flex h-14 items-center justify-between rounded-xl border border-white/5 bg-slate-900/60 px-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="h-8 w-8 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400 animate-pulse" />
            <span className="font-display text-sm font-semibold tracking-tight uppercase">
              Operations Control Deck
            </span>
          </div>
          <span className="h-4 w-px bg-white/10" />
          <div className="px-2.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-400 uppercase tracking-widest font-mono">
            {activeScenario} Scenario
          </div>
        </div>

        {/* Live Simulation Clock */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end font-mono">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Simulated Time</span>
            <span className="text-sm font-bold text-cyan-300">
              {engine.simTime.toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "UTC",
              })}
            </span>
          </div>
        </div>
      </header>

      {/* LEFT COLUMN: SCENARIOS & BUILDER */}
      <aside className="absolute bottom-28 left-4 top-20 z-10 flex w-[330px] flex-col gap-3 overflow-hidden pointer-events-none">
        
        {/* Scenarios Library */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col max-h-[48%] rounded-xl border border-white/5 bg-slate-900/75 p-4 shadow-xl backdrop-blur-md pointer-events-auto"
        >
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-cyan-400" />
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-slate-300">
              Scenarios Library
            </h2>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto pr-1">
            {[
              { key: "normal", label: "Baseline Operations", desc: "No disruptions.", icon: Zap },
              { key: "holiday", label: "Holiday Demand Spike", desc: "2.4x demand lift.", icon: Flame },
              { key: "pandemic", label: "Lockdown Disruption", desc: "Reliability drops to 30%.", icon: ShieldAlert },
              { key: "port_closure", label: "Port Congestion", desc: "3x lead times by sea.", icon: AlertTriangle },
              { key: "natural_disaster", label: "Severe Weather Blockage", desc: "Typhoon delays roads.", icon: CloudLightning },
              { key: "fuel_crisis", label: "Fuel Price Crisis", desc: "4x cargo freight costs.", icon: Coins },
            ].map((scen) => (
              <button
                key={scen.key}
                onClick={() => handleLoadScenario(scen.key)}
                className={`flex items-start gap-2.5 rounded-lg border p-2 text-left transition-all duration-200 ${
                  activeScenario === scen.key
                    ? "bg-cyan-500/10 border-cyan-500 text-white"
                    : "bg-slate-950/40 border-white/5 hover:border-white/20 text-slate-300"
                }`}
              >
                <scen.icon className={`h-4.5 w-4.5 mt-0.5 ${activeScenario === scen.key ? "text-cyan-400" : "text-slate-400"}`} />
                <div>
                  <div className="text-xs font-semibold">{scen.label}</div>
                  <div className="text-[10px] text-slate-500 leading-tight">{scen.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Custom Scenario Builder */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col flex-1 rounded-xl border border-white/5 bg-slate-900/75 p-4 shadow-xl backdrop-blur-md overflow-hidden pointer-events-auto"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sliders className="h-4 w-4 text-cyan-400" />
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-slate-300">
              Custom Scenario Sandbox
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-slate-300 text-xs">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Demand Multiplier</span>
                <span className="font-mono text-cyan-400">{customModifiers.demandWeight.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={customModifiers.demandWeight}
                onChange={(e) => setCustomModifiers(prev => ({ ...prev, demandWeight: parseFloat(e.target.value) }))}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Supplier Reliability</span>
                <span className="font-mono text-cyan-400">{Math.round(customModifiers.supplierReliability * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={customModifiers.supplierReliability}
                onChange={(e) => setCustomModifiers(prev => ({ ...prev, supplierReliability: parseFloat(e.target.value) }))}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Transit Delay scale</span>
                <span className="font-mono text-cyan-400">{customModifiers.leadTimeMultiplier.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="4.0"
                step="0.2"
                value={customModifiers.leadTimeMultiplier}
                onChange={(e) => setCustomModifiers(prev => ({ ...prev, leadTimeMultiplier: parseFloat(e.target.value) }))}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Fuel Cost Factor</span>
                <span className="font-mono text-cyan-400">{customModifiers.fuelCostMultiplier.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.5"
                value={customModifiers.fuelCostMultiplier}
                onChange={(e) => setCustomModifiers(prev => ({ ...prev, fuelCostMultiplier: parseFloat(e.target.value) }))}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
            
            <Button
              onClick={handleApplyCustomParams}
              className="w-full h-8 bg-cyan-600 hover:bg-cyan-500 text-[11px] text-white font-medium"
            >
              Inject Parameters
            </Button>
          </div>
        </motion.div>
      </aside>

      {/* RIGHT COLUMN: ANALYTICS & AI ALERTS */}
      <aside className="absolute bottom-28 right-4 top-20 z-10 flex w-[380px] flex-col gap-3 overflow-hidden pointer-events-none">
        
        {/* Dynamic Object Inspector */}
        <AnimatePresence mode="wait">
          {inspectedNode ? (
            <motion.div
              key="inspector"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="flex flex-col max-h-[58%] rounded-xl border border-white/5 bg-slate-900/80 p-4 shadow-xl backdrop-blur-md pointer-events-auto overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${
                    inspectedNode.node_type === "warehouse"
                      ? (STATUS_COLORS[inspectedNode.status] || STATUS_COLORS.healthy)
                      : TYPE_COLORS[inspectedNode.node_type]
                  }`} />
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-300">
                    {inspectedNode.code} ({inspectedNode.node_type})
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-[10px] text-slate-400 hover:text-white uppercase font-medium"
                >
                  Clear
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-slate-300 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Facility Name</div>
                  <div className="font-semibold text-white">{inspectedNode.name}</div>
                  <div className="text-[11px] text-slate-400">{inspectedNode.city}, {inspectedNode.country}</div>
                </div>

                {/* Warehouse Stats */}
                {inspectedNode.node_type === "warehouse" && (
                  <>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Physical Utilisation</span>
                        <span className="font-mono text-white">
                          {Math.round((inspectedInventory.reduce((acc, i) => acc + i.onHand, 0) / Math.max(1, inspectedNode.capacity || 5000)) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(100, (inspectedInventory.reduce((acc, i) => acc + i.onHand, 0) / Math.max(1, inspectedNode.capacity || 5000)) * 100)} 
                        className="h-1 bg-slate-950" 
                      />
                    </div>

                    {/* Stock items table */}
                    <div className="border border-white/5 rounded-lg overflow-hidden bg-slate-950/40">
                      <div className="grid grid-cols-4 bg-slate-950/80 p-1.5 text-[9px] font-semibold text-slate-400 uppercase">
                        <div>SKU</div>
                        <div className="text-right">On Hand</div>
                        <div className="text-right">On Order</div>
                        <div className="text-right">ROP</div>
                      </div>
                      <div className="max-h-[140px] overflow-y-auto divide-y divide-white/5">
                        {inspectedInventory.map(item => (
                          <div key={item.sku} className="grid grid-cols-4 p-1.5 text-[10px] items-center">
                            <div className="font-mono font-medium text-white">{item.sku}</div>
                            <div className={`text-right font-semibold ${item.onHand <= item.safetyStock ? "text-red-400" : (item.onHand <= item.reorderPoint ? "text-yellow-400" : "text-slate-300")}`}>
                              {item.onHand}
                            </div>
                            <div className="text-right text-slate-400 font-mono">{item.onOrder}</div>
                            <div className="text-right text-slate-400 font-mono">{item.reorderPoint}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Warehouse Actions */}
                    <div className="border-t border-white/5 pt-3 space-y-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Intervene Facility</div>
                      <div className="flex gap-2">
                        <Select onValueChange={(val) => executeEmergencyPurchase(val)}>
                          <SelectTrigger className="h-7 text-[10px] bg-slate-950/60 border-white/10 text-slate-300">
                            <SelectValue placeholder="Refill SKU..." />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/10 text-slate-300 text-[10px]">
                            {inspectedInventory.map(item => (
                              <SelectItem key={item.sku} value={item.sku} className="text-[10px]">
                                Emergency refill {item.sku} (+500)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Stock Transfer Form */}
                      <div className="space-y-1.5 border border-white/5 p-2 rounded-lg bg-slate-950/30">
                        <div className="text-[9px] uppercase text-slate-400">Inter-DC Stock Transfer</div>
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={actionProduct} onValueChange={setActionProduct}>
                            <SelectTrigger className="h-7 text-[10px] bg-slate-950/60 border-white/10 text-slate-300">
                              <SelectValue placeholder="Select SKU" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-[10px]">
                              {inspectedInventory.map(i => (
                                <SelectItem key={i.sku} value={i.sku} className="text-[10px]">{i.sku}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select value={actionDest} onValueChange={setActionDest}>
                            <SelectTrigger className="h-7 text-[10px] bg-slate-950/60 border-white/10 text-slate-300">
                              <SelectValue placeholder="Target DC" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-[10px]">
                              {otherWarehouses.map(w => (
                                <SelectItem key={w.code} value={w.code} className="text-[10px]">{w.code}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="number"
                            value={actionQty}
                            onChange={(e) => setActionQty(e.target.value)}
                            className="h-7 w-20 text-[10px] bg-slate-950/60 border-white/10 text-slate-300"
                            placeholder="Qty"
                          />
                          <Button
                            onClick={executeStockTransfer}
                            disabled={!actionProduct || !actionDest}
                            className="flex-1 h-7 text-[9px] bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
                          >
                            Dispatch transfer
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Supplier Stats */}
                {inspectedNode.node_type === "supplier" && (
                  <>
                    <div className="grid grid-cols-2 gap-3 border border-white/5 p-2 rounded-lg bg-slate-950/20">
                      <div>
                        <div className="text-[9px] text-slate-400 uppercase">Reliability Rate</div>
                        <div className="text-sm font-bold text-white">
                          {(inspectedNode.reliability_bias ? inspectedNode.reliability_bias * 100 : 95).toFixed(0)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-400 uppercase">Lead Time Penalty</div>
                        <div className="text-sm font-bold text-slate-300">
                          {inspectedNode.lead_time_days || "No delay"}
                        </div>
                      </div>
                    </div>

                    {/* Outbound Lanes */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Outbound Shipping Lanes</div>
                      <div className="space-y-1.5">
                        {visualData.lanes
                          .filter(l => l.supplier_code === inspectedNode.code)
                          .map(lane => {
                            const isExpedited = engine.expeditedLanes.has(lane.id);
                            return (
                              <div key={lane.id} className="flex justify-between items-center p-2 rounded-lg border border-white/5 bg-slate-950/40 text-[10px]">
                                <div>
                                  <div className="font-semibold text-white">To: {lane.warehouse_code}</div>
                                  <div className="text-slate-500 uppercase font-mono text-[9px]">{lane.mode} • {lane.distance_km} km</div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => toggleExpediteLane(lane.id)}
                                  className={`h-6 text-[9px] font-medium ${
                                    isExpedited ? "bg-purple-600 hover:bg-purple-500 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                                  }`}
                                >
                                  {isExpedited ? "Expedited Air" : "Expedite Lane"}
                                </Button>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="ai-feed"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="flex flex-col max-h-[58%] rounded-xl border border-white/5 bg-slate-900/80 p-4 shadow-xl backdrop-blur-md pointer-events-auto overflow-hidden"
            >
              <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <h2 className="font-display text-xs font-bold uppercase tracking-wider text-slate-300">
                  AI Decision Engine Feed
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {aiAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border text-xs leading-relaxed space-y-1.5 transition-colors duration-200 ${
                      alert.severity === "critical"
                        ? "bg-red-500/10 border-red-500/30"
                        : alert.severity === "warning"
                        ? "bg-yellow-500/5 border-yellow-500/20"
                        : "bg-slate-950/40 border-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-white">
                      {alert.severity === "critical" ? (
                        <ShieldAlert className="h-4 w-4 text-red-400" />
                      ) : alert.severity === "warning" ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      ) : (
                        <Sparkle className="h-4 w-4 text-cyan-400" />
                      )}
                      <span>{alert.title}</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{alert.description}</p>
                    <div className="grid grid-cols-2 text-[10px] text-slate-500 pt-1 border-t border-white/5">
                      <div>
                        <div className="uppercase text-[8px] text-slate-500">Projected Impact</div>
                        <div className="font-semibold text-slate-300">{alert.impact}</div>
                      </div>
                      <div>
                        <div className="uppercase text-[8px] text-slate-500">Rec Action</div>
                        <div className="font-semibold text-cyan-300">{alert.action}</div>
                      </div>
                    </div>
                    {alert.type === "supplier_risk" && (
                      <Button
                        size="sm"
                        onClick={() => executeAdjustBuffer(1.4)}
                        className="w-full h-6 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/20 text-[9px] font-semibold mt-1"
                      >
                        Adjust safety stock scale (1.4x)
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Event Log */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col flex-1 rounded-xl border border-white/5 bg-slate-900/75 p-4 shadow-xl backdrop-blur-md overflow-hidden pointer-events-auto"
        >
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-slate-400" />
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-slate-400">
              Live Operations Feed
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-[9px] text-slate-500 leading-tight">
            {historyLogs.slice(-25).reverse().map((log) => (
              <div key={log.id} className="flex gap-2 py-0.5 border-b border-white/5 last:border-0">
                <span className="text-cyan-500 shrink-0">
                  {new Date(log.ts).toLocaleTimeString("en-US", { hour12: false })}
                </span>
                <span className="text-slate-400 shrink-0 uppercase">
                  [{log.type}]
                </span>
                <span className="text-slate-300 truncate">
                  {log.title}: {log.description}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </aside>

      {/* BOTTOM PANEL: KPIS & SIM TIME CONTROLS */}
      <footer className="absolute bottom-4 left-4 right-4 z-10 flex h-20 items-center justify-between rounded-xl border border-white/5 bg-slate-900/75 px-4 shadow-xl backdrop-blur-md">
        
        {/* KPI metrics */}
        <div className="flex items-center gap-4 flex-1 pr-6 divide-x divide-white/5">
          
          {/* Health score circle */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-cyan-500/20 bg-cyan-500/5 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <span className="text-xs font-bold font-mono text-cyan-400">{kpis.healthScore}</span>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider leading-none mb-1">Health Score</div>
              <div className="text-xs font-semibold text-white">SC Operational SLA</div>
            </div>
          </div>

          {/* Financials card */}
          <div className="px-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider leading-none mb-1">Operating Profit</div>
            <div className={`text-sm font-bold ${kpis.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {kpis.profit >= 0 ? "+" : ""}{fmtCurrency(kpis.profit)}
            </div>
            <div className="text-[9px] text-slate-500 leading-none">
              Rev: {fmtCurrency(kpis.revenue)}
            </div>
          </div>

          {/* Fulfilment SLA */}
          <div className="px-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider leading-none mb-1">Order Fulfillment</div>
            <div className="text-sm font-bold text-white">{kpis.fillRate.toFixed(1)}%</div>
            <Progress value={kpis.fillRate} className="h-1 bg-slate-950 w-24 mt-1" />
          </div>

          {/* OTD rate */}
          <div className="px-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider leading-none mb-1">On-Time Delivery</div>
            <div className="text-sm font-bold text-slate-300">{kpis.otd.toFixed(1)}%</div>
            <div className="text-[9px] text-slate-500">
              Late: {engine.kpis.lateDeliveries} POs
            </div>
          </div>

          {/* Carbon Footprint */}
          <div className="px-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider leading-none mb-1">Carbon Drag</div>
            <div className="text-sm font-bold text-teal-400">{(kpis.carbonEmissions / 1000).toFixed(2)} t CO2</div>
            <div className="text-[9px] text-slate-500">Green Logistics Drag</div>
          </div>

          {/* Logistics Fleet active */}
          <div className="px-4 hidden lg:block">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider leading-none mb-1">In-Transit Assets</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>{kpis.activeShipmentsCount} units</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="text-[9px] text-slate-500">Vehicles on map</div>
          </div>

        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-3 shrink-0 pl-4 border-l border-white/5">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsRunning(!isRunning)}
            className="h-9 w-9 rounded-lg border-white/10 bg-slate-950 hover:bg-slate-900 text-white hover:text-cyan-400 shadow"
          >
            {isRunning ? <Pause className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5" />}
          </Button>

          {/* Speed selectors */}
          <div className="flex rounded-lg border border-white/10 bg-slate-950 p-0.5">
            {[
              { val: "slow", label: "0.5x" },
              { val: "normal", label: "1x" },
              { val: "fast", label: "3x" },
              { val: "max", label: "10x" },
            ].map(opt => (
              <button
                key={opt.val}
                onClick={() => setSimSpeed(opt.val)}
                className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${
                  simSpeed === opt.val
                    ? "bg-cyan-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => handleLoadScenario(activeScenario)}
            className="h-9 w-9 rounded-lg border-white/10 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white"
            title="Restart Scenario"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

      </footer>
    </div>
  );
}
