import React, { useState, useRef, useEffect, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import {
  Sparkles,
  Globe,
  Boxes,
  ShieldAlert,
  LineChart,
  BarChart,
  Activity,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

// --- 3D Background Component ---
function BackgroundScene({ activeSection }) {
  const { camera } = useThree();
  const pointsRef = useRef();
  const globeRef = useRef();
  const waveRef = useRef();
  const boxGroupRef = useRef();

  // Lerp camera and object transformations based on the active section
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();

    // Base rotations
    if (globeRef.current) {
      globeRef.current.rotation.y = time * 0.1;
      globeRef.current.rotation.x = Math.sin(time * 0.05) * 0.1;
    }
    if (boxGroupRef.current) {
      boxGroupRef.current.rotation.y = time * 0.08;
      boxGroupRef.current.rotation.x = time * 0.05;
    }

    // Camera and mesh position interpolation targets
    let targetCamPos = [0, 0, 8];
    let targetCamLook = [0, 0, 0];

    // Morph shapes visibility based on active section
    if (globeRef.current) globeRef.current.visible = false;
    if (boxGroupRef.current) boxGroupRef.current.visible = false;
    if (waveRef.current) waveRef.current.visible = false;
    if (pointsRef.current) pointsRef.current.visible = false;

    switch (activeSection) {
      case 0: // Hero: Spinning Globe
        targetCamPos = [0, 0, 7.5];
        if (globeRef.current) globeRef.current.visible = true;
        break;
      case 1: // AI Copilot: Glowing brain/constellation
        targetCamPos = [-1.8, 1.2, 6];
        if (globeRef.current) {
          globeRef.current.visible = true;
          // Scale down or position to the side
          globeRef.current.position.set(1.5, 0, 0);
        }
        break;
      case 2: // Network Map: Overhead network node look
        targetCamPos = [0, 4.5, 5];
        targetCamLook = [0, 0, -1];
        if (globeRef.current) {
          globeRef.current.visible = true;
          globeRef.current.position.set(0, -1, -1);
        }
        break;
      case 3: // Warehouse: 3D Box Grid
        targetCamPos = [3.2, 2.5, 5.5];
        if (boxGroupRef.current) {
          boxGroupRef.current.visible = true;
          boxGroupRef.current.position.set(-1, -0.5, 0);
        }
        break;
      case 4: // Suppliers & Risk: Glowing orbits
        targetCamPos = [0, 0, 7];
        if (boxGroupRef.current) {
          boxGroupRef.current.visible = true;
          boxGroupRef.current.position.set(0, 0, 0);
        }
        break;
      case 5: // Inventory: Floating particle streams
        targetCamPos = [2.5, 0.2, 6.5];
        if (pointsRef.current) {
          pointsRef.current.visible = true;
          pointsRef.current.position.set(-1.2, 0, 0);
          pointsRef.current.rotation.y = time * 0.15;
        }
        break;
      case 6: // Forecasting: Neon wave
        targetCamPos = [-2.2, 1.8, 6];
        if (waveRef.current) {
          waveRef.current.visible = true;
          waveRef.current.position.set(1.5, -0.5, 0);
          waveRef.current.rotation.y = time * 0.1;
        }
        break;
      case 7: // Simulation: Fast rotating points
        targetCamPos = [0, 2.8, 6.5];
        if (pointsRef.current) {
          pointsRef.current.visible = true;
          pointsRef.current.position.set(0, -0.5, 0);
          pointsRef.current.rotation.y = time * 0.4;
        }
        break;
      case 8: // Analytics: Prism structures
        targetCamPos = [2.2, 3.2, 6];
        if (boxGroupRef.current) {
          boxGroupRef.current.visible = true;
          boxGroupRef.current.position.set(-1.5, -0.8, 0);
        }
        break;
      case 9: // Portal: Speed warp
        targetCamPos = [0, 0, 3 + Math.sin(time * 2) * 0.5];
        if (pointsRef.current) {
          pointsRef.current.visible = true;
          pointsRef.current.position.set(0, 0, 0);
          pointsRef.current.rotation.z = time * 0.8;
        }
        break;
      default:
        break;
    }

    // Lerp Camera Position
    camera.position.lerp(new THREE.Vector3(...targetCamPos), 0.05);

    // Lerp Camera LookAt target
    const currentLook = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const targetLookVec = new THREE.Vector3(...targetCamLook);
    currentLook.lerp(targetLookVec, 0.05);
    camera.lookAt(currentLook);
  });

  // Generate deterministic points for Globe
  const [globePoints] = useState(() => {
    const pts = [];
    const count = 1200;
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 2.2;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      pts.push(x, y, z);
    }
    return new Float32Array(pts);
  });

  // Generate points for Wave
  const [wavePoints] = useState(() => {
    const pts = [];
    const rows = 40;
    const cols = 40;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - cols / 2) * 0.16;
        const z = (r - rows / 2) * 0.16;
        const y = Math.sin(Math.sqrt(x * x + z * z)) * 0.5;
        pts.push(x, y, z);
      }
    }
    return new Float32Array(pts);
  });

  // Generate generic abstract points cluster
  const [clusterPoints] = useState(() => {
    const pts = [];
    for (let i = 0; i < 900; i++) {
      pts.push((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    }
    return new Float32Array(pts);
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} color="#06b6d4" />
      <pointLight position={[-6, 5, -6]} intensity={0.8} color="#3b82f6" />

      {/* 1. Globe Shape */}
      <group ref={globeRef}>
        <Points positions={globePoints} stride={3}>
          <PointMaterial transparent color="#22d3ee" size={0.045} sizeAttenuation depthWrite={false} />
        </Points>
        {/* Draw subtle connections or circles */}
        <mesh>
          <sphereGeometry args={[2.18, 16, 16]} />
          <meshBasicMaterial color="#0e7490" wireframe transparent opacity={0.12} />
        </mesh>
      </group>

      {/* 2. Warehouse / Prisms */}
      <group ref={boxGroupRef}>
        {Array.from({ length: 27 }).map((_, i) => {
          const col = i % 3;
          const row = Math.floor((i % 9) / 3);
          const lvl = Math.floor(i / 9);
          const active = (i + activeSection) % 3 === 0;
          return (
            <group key={i} position={[(col - 1) * 1.3, (lvl - 1) * 1.1, (row - 1) * 1.3]}>
              <mesh>
                <boxGeometry args={[0.7, 0.7, 0.7]} />
                <meshStandardMaterial
                  color={active ? "#22d3ee" : "#1e293b"}
                  emissive={active ? "#0891b2" : "#0f172a"}
                  emissiveIntensity={active ? 1.0 : 0.15}
                  wireframe
                  transparent
                  opacity={0.7}
                />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* 3. Wave */}
      <group ref={waveRef}>
        <Points positions={wavePoints} stride={3}>
          <PointMaterial transparent color="#a855f7" size={0.05} sizeAttenuation depthWrite={false} />
        </Points>
      </group>

      {/* 4. Particle Cluster */}
      <group ref={pointsRef}>
        <Points positions={clusterPoints} stride={3}>
          <PointMaterial transparent color="#10b981" size={0.04} sizeAttenuation depthWrite={false} />
        </Points>
      </group>
    </>
  );
}

// --- Main Page Component ---
export default function LandingPage() {
  const [activeSection, setActiveSection] = useState(0);
  const [isWarping, setIsWarping] = useState(false);
  const scrollContainerRef = useRef(null);
  const navigate = useNavigate();

  // Update active slide index based on scroll position
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, clientHeight } = scrollContainerRef.current;
    const index = Math.round(scrollTop / clientHeight);
    if (index !== activeSection) {
      setActiveSection(index);
    }
  };

  const handleEnterPlatform = () => {
    setIsWarping(true);
    setTimeout(() => {
      navigate("/dashboard");
    }, 1100); // Warp speed transition length
  };

  return (
    <div className="relative h-screen w-full bg-[#030712] text-foreground select-none overflow-hidden">
      {/* 3D background */}
      <div className="absolute inset-0 z-0 h-full w-full pointer-events-none">
        <Canvas camera={{ position: [0, 0, 7.5], fov: 45 }} dpr={[1, 1.5]}>
          <Suspense fallback={null}>
            <BackgroundScene activeSection={activeSection} />
          </Suspense>
        </Canvas>
      </div>

      {/* Ambient Grid overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-radial-gradient from-transparent to-[#030712]/90 opacity-70" />

      {/* Interactive indicator bar */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-30 hidden flex-col gap-3.5 md:flex">
        {Array.from({ length: 10 }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              scrollContainerRef.current?.scrollTo({
                top: idx * window.innerHeight,
                behavior: "smooth",
              });
            }}
            className="group flex items-center gap-3 text-left focus:outline-none"
          >
            <span
              className={`h-1.5 transition-all duration-300 rounded-full ${
                activeSection === idx
                  ? "w-8 bg-[hsl(var(--primary))] shadow-[0_0_8px_hsl(var(--primary))]"
                  : "w-2.5 bg-slate-600 hover:bg-slate-400 group-hover:w-4"
              }`}
            />
            <span
              className={`text-[10px] tracking-widest uppercase font-display font-medium transition-all duration-300 ${
                activeSection === idx ? "text-[hsl(var(--primary))] opacity-100" : "text-slate-500 opacity-0 group-hover:opacity-100"
              }`}
            >
              {idx === 0 && "Hero"}
              {idx === 1 && "Intelligence"}
              {idx === 2 && "Global Network"}
              {idx === 3 && "Warehouse 3D"}
              {idx === 4 && "Supplier Risk"}
              {idx === 5 && "Inventory Opt"}
              {idx === 6 && "Demand Forecasting"}
              {idx === 7 && "Sim Tick Engine"}
              {idx === 8 && "Analytics Studio"}
              {idx === 9 && "Access Deck"}
            </span>
          </button>
        ))}
      </div>

      {/* Top Header Logo */}
      <div className="absolute left-6 top-6 z-30 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.14)] ring-1 ring-[hsl(var(--primary)/0.35)] shadow-[0_0_10px_rgba(34,211,238,0.15)]">
          <Globe className="h-4.5 w-4.5 text-[hsl(var(--primary))] animate-pulse" size={18} />
        </div>
        <div>
          <span className="font-display text-xs font-semibold uppercase tracking-wider text-slate-300">AURORA FORGE</span>
          <span className="ml-2 rounded bg-cyan-950/60 border border-cyan-800/40 px-1 py-0.5 font-mono text-[8px] tracking-normal text-cyan-400">
            ENTERPRISE TWIN
          </span>
        </div>
      </div>

      {/* Quick Launch CTA at top right */}
      <button
        onClick={handleEnterPlatform}
        className="absolute right-6 top-6 z-30 flex items-center gap-1 text-[11px] font-display font-semibold uppercase tracking-wider text-cyan-400 hover:text-white transition-colors duration-200"
      >
        Skip to Console <ArrowRight size={12} />
      </button>

      {/* Warp Screen Overlay */}
      <AnimatePresence>
        {isWarping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1.15, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.1, times: [0, 0.3, 0.8, 1] }}
              className="text-center"
            >
              <div className="font-display text-lg font-bold tracking-[0.2em] text-cyan-400 uppercase">
                Initializing Control Room
              </div>
              <div className="mt-2 text-xs font-mono text-slate-500">
                Grounded Database connection active · Syncing live clock...
              </div>
            </motion.div>
            {/* Warp effect flash */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-cyan-500/10 via-transparent to-purple-500/10 mix-blend-screen animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable presentation slides container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative z-20 h-screen w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
      >
        {/* --- Slide 0: Hero --- */}
        <div className="relative h-screen w-full flex items-center justify-center snap-start px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl text-center"
          >
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-800/40 bg-cyan-950/30 px-3.5 py-1 text-[10px] tracking-wider text-cyan-400 uppercase font-display font-medium">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active Digital Simulation Engine
            </div>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl">
              AURORA FORGE
            </h2>
            <p className="mt-2 font-display text-sm tracking-[0.3em] uppercase text-slate-400 sm:text-base">
              Supply Chain Digital Twin Platform
            </p>
            <p className="mt-6 text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
              Command, optimize, and simulate your global supply network. Grounded entirely in real-time seeded data, Holt-Winters analytics, and cognitive LLM operations support.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => {
                  scrollContainerRef.current?.scrollTo({
                    top: window.innerHeight,
                    behavior: "smooth",
                  });
                }}
                className="group flex items-center gap-2 rounded-xl bg-cyan-500/12 px-5 py-3 text-xs font-display font-semibold uppercase tracking-wider text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/22 transition-all duration-200"
              >
                Explore Platform <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={handleEnterPlatform}
                className="rounded-xl bg-white px-5 py-3 text-xs font-display font-semibold uppercase tracking-wider text-black hover:bg-slate-200 transition-colors"
              >
                Control Center
              </button>
            </div>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-[10px] font-display uppercase tracking-widest text-slate-500">
              Scroll down to explore
            </div>
          </motion.div>
        </div>

        {/* --- Slide 1: AI Copilot --- */}
        <div className="relative h-screen w-full flex items-center justify-between snap-start px-6 md:px-20 lg:px-32">
          <div className="max-w-md md:max-w-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/12 border border-purple-500/30 text-purple-400">
              <Sparkles size={18} />
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold text-white sm:text-4xl">
              Atlas AI Copilot
            </h3>
            <p className="mt-1 font-mono text-[10px] tracking-widest uppercase text-purple-400">
              Cognitive Decision Layer
            </p>
            <p className="mt-4 text-xs md:text-sm text-slate-400 leading-relaxed">
              Meet Atlas, your cognitive supply chain advisor. Grounded directly in live warehouse capacities, lead times, and risk metrics. Ask about stockout statuses or receive instant optimization steps.
            </p>
            <div className="mt-6 space-y-2 font-mono text-[10px] text-slate-500">
              <div className="flex gap-2">
                <span className="text-cyan-400">PROMPT:</span> Which SKU has the highest stockout risk?
              </div>
              <div className="flex gap-2 text-slate-400">
                <span className="text-purple-400">ATLAS:</span> SKU <span className="text-cyan-300">ELX-6001</span> at DC-LAX (3.2 days of supply remaining).
              </div>
            </div>
          </div>
        </div>

        {/* --- Slide 2: Global Network Map --- */}
        <div className="relative h-screen w-full flex items-center justify-end snap-start px-6 md:px-20 lg:px-32">
          <div className="max-w-md md:max-w-lg text-right">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/12 border border-cyan-500/30 text-cyan-400 ml-auto">
              <Globe size={18} />
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold text-white sm:text-4xl">
              Global Logistics Map
            </h3>
            <p className="mt-1 font-mono text-[10px] tracking-widest uppercase text-cyan-400">
              Deck.gl Spatial Telemetry
            </p>
            <p className="mt-4 text-xs md:text-sm text-slate-400 leading-relaxed">
              Visualize real-time shipping lanes, active cargo vectors, and warehouse nodes. Real coordinate paths are interpolated dynamically, providing complete, actionable visibility over your global transit lines.
            </p>
          </div>
        </div>

        {/* --- Slide 3: 3D Warehouses --- */}
        <div className="relative h-screen w-full flex items-center justify-between snap-start px-6 md:px-20 lg:px-32">
          <div className="max-w-md md:max-w-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/12 border border-amber-500/30 text-amber-400">
              <Boxes size={18} />
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold text-white sm:text-4xl">
              Warehouse Spatial Twins
            </h3>
            <p className="mt-1 font-mono text-[10px] tracking-widest uppercase text-amber-400">
              R3F Interactive Bin Grid
            </p>
            <p className="mt-4 text-xs md:text-sm text-slate-400 leading-relaxed">
              Inspect inventory at the bin level inside our 3D digital warehouses. Color-coded structures indicate health statuses: healthy stock (cyan), low stock (amber), and critical stockout warnings (red).
            </p>
          </div>
        </div>

        {/* --- Slide 4: Suppliers & Risk --- */}
        <div className="relative h-screen w-full flex items-center justify-end snap-start px-6 md:px-20 lg:px-32">
          <div className="max-w-md md:max-w-lg text-right">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/12 border border-red-500/30 text-red-400 ml-auto">
              <ShieldAlert size={18} />
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold text-white sm:text-4xl">
              Supplier Risk Intelligence
            </h3>
            <p className="mt-1 font-mono text-[10px] tracking-widest uppercase text-red-400">
              Geo-Political Risk Scoring
            </p>
            <p className="mt-4 text-xs md:text-sm text-slate-400 leading-relaxed">
              Identify supplier performance and lane vulnerabilities. Risk models evaluate transit times, lead times, and historical delays, yielding a clear risk classification (low, medium, high) with explainable drivers.
            </p>
          </div>
        </div>

        {/* --- Slide 5: Inventory Optimization --- */}
        <div className="relative h-screen w-full flex items-center justify-between snap-start px-6 md:px-20 lg:px-32">
          <div className="max-w-md md:max-w-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/12 border border-emerald-500/30 text-emerald-400">
              <Boxes size={18} />
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold text-white sm:text-4xl">
              Inventory Optimization
            </h3>
            <p className="mt-1 font-mono text-[10px] tracking-widest uppercase text-emerald-400">
              ABC & EOQ Optimization Models
            </p>
            <p className="mt-4 text-xs md:text-sm text-slate-400 leading-relaxed">
              Maintains optimal warehouse volumes. Dynamically calculates Economic Order Quantity (EOQ), Safety Stock bounds, and reorder points based on live demand history. Reduce surplus capital and avoid out-of-stock incidents.
            </p>
          </div>
        </div>

        {/* --- Slide 6: Demand Forecasting --- */}
        <div className="relative h-screen w-full flex items-center justify-end snap-start px-6 md:px-20 lg:px-32">
          <div className="max-w-md md:max-w-lg text-right">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/12 border border-purple-500/30 text-purple-400 ml-auto">
              <LineChart size={18} />
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold text-white sm:text-4xl">
              Demand Forecasting Studio
            </h3>
            <p className="mt-1 font-mono text-[10px] tracking-widest uppercase text-purple-400">
              Holt-Winters Exponential Smoothing
            </p>
            <p className="mt-4 text-xs md:text-sm text-slate-400 leading-relaxed">
              Predict future inventory needs. The forecasting system runs seasonal double/triple-exponential smoothing models, returning future demand curves with statistical confidence boundaries.
            </p>
          </div>
        </div>

        {/* --- Slide 7: Real-time Simulation --- */}
        <div className="relative h-screen w-full flex items-center justify-between snap-start px-6 md:px-20 lg:px-32">
          <div className="max-w-md md:max-w-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/12 border border-blue-500/30 text-blue-400">
              <Activity size={18} />
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold text-white sm:text-4xl">
              Simulation Engine
            </h3>
            <p className="mt-1 font-mono text-[10px] tracking-widest uppercase text-blue-400">
              Deterministic Event Simulator
            </p>
            <p className="mt-4 text-xs md:text-sm text-slate-400 leading-relaxed">
              A state-machine background simulation model. Every simulation tick progresses transit fleets along waypoints, consumes market demand, triggers automated safety reorders, and registers inventory arrivals.
            </p>
          </div>
        </div>

        {/* --- Slide 8: Analytics Studio --- */}
        <div className="relative h-screen w-full flex items-center justify-end snap-start px-6 md:px-20 lg:px-32">
          <div className="max-w-md md:max-w-lg text-right">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/12 border border-pink-500/30 text-pink-400 ml-auto">
              <BarChart size={18} />
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold text-white sm:text-4xl">
              Deep Analytics Studio
            </h3>
            <p className="mt-1 font-mono text-[10px] tracking-widest uppercase text-pink-400">
              Treemaps, Sankeys & Heatmaps
            </p>
            <p className="mt-4 text-xs md:text-sm text-slate-400 leading-relaxed">
              Gain visual insights with advanced multi-dimensional charts. Track supply flow streams, product category valuations, seasonal demand heatmaps, and force-directed networks of nodes and lanes.
            </p>
          </div>
        </div>

        {/* --- Slide 9: Launch Portal --- */}
        <div className="relative h-screen w-full flex items-center justify-center snap-start px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false }}
            className="glass-panel text-center max-w-xl p-8 border-cyan-500/20 bg-slate-950/70 backdrop-blur-md"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/12 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
              <TrendingUp size={22} className="animate-bounce" />
            </div>
            <h3 className="mt-5 font-display text-3xl font-bold text-white">
              Launch Control Room
            </h3>
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              Transition into the active operations control room. Inspect simulated shipping corridors, optimize warehouse replenishment triggers, and query the cognitive LLM copilot.
            </p>
            <button
              onClick={handleEnterPlatform}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3.5 text-xs font-display font-semibold uppercase tracking-wider text-slate-950 hover:bg-cyan-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.35)] transition-all duration-200"
            >
              Access Digital Twin Console <ArrowRight size={13} />
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
