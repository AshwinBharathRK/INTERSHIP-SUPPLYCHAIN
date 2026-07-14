import React, { useMemo, useState, useRef, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, ContactShadows } from "@react-three/drei";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { StatusChip } from "@/components/common/SeverityBadge";
import { fetchers } from "@/lib/api";
import { fmtCurrency, fmtNumber } from "@/lib/format";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_COLORS = { healthy: "#22d3ee", low: "#f59e0b", critical: "#ef4444" };
const STATUS_EMISSIVE = { healthy: "#0e7490", low: "#92400e", critical: "#991b1b" };

const RACK_W = 2.4;
const RACK_D = 1.1;
const RACK_H = 2.6;
const GAP_X = 1.6;
const GAP_Z = 2.4;

function Bin({ position, color, emissive, hovered }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.32, 0.5, 0.9]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={hovered ? 0.9 : 0.35}
        roughness={0.35}
        metalness={0.15}
      />
    </mesh>
  );
}

function Rack({ rack, levels, slots, onSelect, hoveredId, setHoveredId }) {
  const hovered = hoveredId === rack.rack_id;
  const x = rack.col * (RACK_W + GAP_X);
  const z = rack.row * (RACK_D + GAP_Z);
  const totalBins = levels * slots;
  const filled = Math.round(rack.fill_pct * totalBins);
  const color = STATUS_COLORS[rack.status];
  const emissive = STATUS_EMISSIVE[rack.status];

  const bins = [];
  for (let i = 0; i < filled; i++) {
    const level = Math.floor(i / slots);
    const slot = i % slots;
    bins.push(
      <Bin
        key={i}
        position={[-RACK_W / 2 + 0.25 + slot * 0.38, 0.32 + level * 0.62, 0]}
        color={color}
        emissive={emissive}
        hovered={hovered}
      />
    );
  }

  const shelves = [];
  for (let l = 0; l <= levels; l++) {
    shelves.push(
      <mesh key={`s${l}`} position={[0, l * 0.62 + 0.02, 0]}>
        <boxGeometry args={[RACK_W, 0.04, RACK_D]} />
        <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.4} />
      </mesh>
    );
  }

  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(rack);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredId(rack.rack_id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHoveredId(null);
        document.body.style.cursor = "default";
      }}
    >
      {/* posts */}
      {[[-RACK_W / 2, RACK_D / 2], [RACK_W / 2, RACK_D / 2], [-RACK_W / 2, -RACK_D / 2], [RACK_W / 2, -RACK_D / 2]].map(([px, pz], i) => (
        <mesh key={i} position={[px, RACK_H / 2, pz]}>
          <boxGeometry args={[0.07, RACK_H, 0.07]} />
          <meshStandardMaterial color={hovered ? "#7dd3fc" : "#475569"} roughness={0.5} metalness={0.5} />
        </mesh>
      ))}
      {shelves}
      {bins}
      {hovered && (
        <Html position={[0, RACK_H + 0.55, 0]} center distanceFactor={14} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-lg border border-[hsl(var(--stroke-soft))] bg-[hsl(222,22%,10%)] px-3 py-2 text-[11px] shadow-xl">
            <div className="font-semibold text-white">{rack.sku} · {rack.rack_id}</div>
            <div className="text-slate-400">{rack.product_name}</div>
            <div className="mt-1 font-mono text-cyan-300">{fmtNumber(rack.on_hand, false)} units · {Math.round(rack.fill_pct * 100)}% full</div>
          </div>
        </Html>
      )}
    </group>
  );
}

function Scene({ data, onSelect, autoRotate }) {
  const groupRef = useRef();
  const [hoveredId, setHoveredId] = useState(null);
  const racks = data?.racks || [];
  const cols = 6;
  const rows = Math.ceil(racks.length / cols);
  const centerX = ((cols - 1) * (RACK_W + GAP_X)) / 2;
  const centerZ = ((rows - 1) * (RACK_D + GAP_Z)) / 2;

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) groupRef.current.rotation.y += delta * 0.05;
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[12, 18, 8]} intensity={1.4} color="#e0f2fe" />
      <pointLight position={[-10, 8, -6]} intensity={0.5} color="#22d3ee" />
      <fog attach="fog" args={["#0a0e14", 30, 85]} />
      <group ref={groupRef}>
        <group position={[-centerX, 0, -centerZ]}>
          {racks.map((rack) => (
            <Rack key={rack.rack_id} rack={rack} levels={data.levels} slots={data.slots_per_level} onSelect={onSelect} hoveredId={hoveredId} setHoveredId={setHoveredId} />
          ))}
        </group>
        {/* floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <planeGeometry args={[90, 90]} />
          <meshStandardMaterial color="#0d1420" roughness={0.9} metalness={0.1} />
        </mesh>
        <gridHelper args={[90, 45, "#1e293b", "#141c2b"]} position={[0, 0.001, 0]} />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.5} scale={60} blur={2.4} far={10} />
      </group>
    </>
  );
}

export default function WarehouseTwin() {
  const [code, setCode] = useState("DC-LAX");
  const [selectedRack, setSelectedRack] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const controlsRef = useRef();

  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: fetchers.warehouses, staleTime: 60000 });
  const { data } = useQuery({
    queryKey: ["threed", code],
    queryFn: () => fetchers.warehouseThreed(code),
    refetchInterval: 6000,
  });

  React.useEffect(() => {
    if (warehouses && warehouses.length > 0) {
      const hasCode = warehouses.some((w) => w.code === code);
      if (!hasCode) {
        setCode(warehouses[0].code);
      }
    }
  }, [warehouses, code]);

  const summary = data?.summary;

  return (
    <div className="relative h-full w-full bg-[#0a0e14]" data-testid="warehouse-page">
      <Canvas camera={{ position: [16, 13, 20], fov: 42 }} dpr={[1, 1.75]} data-testid="warehouse-3d-canvas">
        <Suspense fallback={null}>
          <Scene data={data} onSelect={setSelectedRack} autoRotate={autoRotate} />
        </Suspense>
        <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.08} minDistance={6} maxDistance={55} maxPolarAngle={Math.PI / 2.05} />
      </Canvas>

      {/* Toolbar */}
      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2" data-testid="warehouse-toolbar">
        <Select value={code} onValueChange={setCode}>
          <SelectTrigger className="glass-panel-solid h-9 w-[220px] border-[hsl(var(--stroke-soft))] text-xs" data-testid="warehouse-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(warehouses || []).map((w) => (
              <SelectItem key={w.code} value={w.code} data-testid={`warehouse-option-${w.code}`}>
                {w.code} — {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAutoRotate((r) => !r)}
          data-testid="warehouse-rotate-toggle"
          className={`glass-panel-solid h-9 gap-1.5 border-[hsl(var(--stroke-soft))] text-xs ${autoRotate ? "text-[hsl(var(--primary))]" : "text-muted-foreground"}`}
        >
          <RotateCcw size={13} /> {autoRotate ? "Auto-orbit on" : "Auto-orbit off"}
        </Button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="glass-panel-solid absolute right-3 top-3 flex gap-4 px-4 py-2.5" data-testid="warehouse-summary">
          <Stat label="Units" value={fmtNumber(summary.total_units)} />
          <Stat label="Value" value={fmtCurrency(summary.total_value)} />
          <Stat label="Critical" value={summary.critical} tone={summary.critical > 0 ? "crit" : undefined} />
          <Stat label="Low" value={summary.low} tone={summary.low > 0 ? "warn" : undefined} />
        </div>
      )}

      {/* Legend */}
      <div className="glass-panel-solid absolute bottom-4 left-3 flex gap-4 px-3.5 py-2.5 text-[11px] text-muted-foreground" data-testid="warehouse-legend">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#22d3ee]" /> Healthy stock</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#f59e0b]" /> Below reorder point</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#ef4444]" /> Critical / stockout risk</span>
        <span className="hidden text-muted-foreground/70 lg:inline">Drag to orbit · scroll to zoom · click a rack to inspect</span>
      </div>

      {/* Rack inspector */}
      <Sheet open={!!selectedRack} onOpenChange={(o) => !o && setSelectedRack(null)}>
        <SheetContent side="right" className="w-full border-[hsl(var(--stroke-soft)/0.6)] bg-[hsl(var(--surface-1)/0.97)] sm:max-w-[400px]" data-testid="rack-inspector">
          {selectedRack && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-base">{selectedRack.rack_id} · {selectedRack.sku}</SheetTitle>
                <SheetDescription className="text-xs">{selectedRack.product_name} · {selectedRack.category}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <StatusChip status={selectedRack.status} />
                  <span className="font-mono text-xs text-muted-foreground">{Math.round(selectedRack.fill_pct * 100)}% occupancy</span>
                </div>
                <Progress value={selectedRack.fill_pct * 100} className="h-2" />
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <RackInfo label="On hand" value={`${fmtNumber(selectedRack.on_hand, false)} units`} />
                  <RackInfo label="Inbound" value={`${fmtNumber(selectedRack.on_order, false)} units`} />
                  <RackInfo label="Days of supply" value={selectedRack.days_of_supply} />
                  <RackInfo label="Stock value" value={fmtCurrency(selectedRack.stock_value)} />
                  <RackInfo label="Safety stock" value={fmtNumber(selectedRack.safety_stock, false)} />
                  <RackInfo label="Reorder point" value={fmtNumber(selectedRack.reorder_point, false)} />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

const Stat = ({ label, value, tone }) => (
  <div className="text-center">
    <div className={`font-display text-sm font-semibold tabular-nums ${tone === "crit" ? "text-[hsl(var(--critical))]" : tone === "warn" ? "text-[hsl(var(--warning))]" : ""}`}>{value}</div>
    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
  </div>
);

const RackInfo = ({ label, value }) => (
  <div className="rounded-lg border border-[hsl(var(--stroke-soft)/0.4)] bg-[hsl(var(--surface-2)/0.35)] px-2.5 py-2">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="mt-0.5 text-xs font-medium">{value}</div>
  </div>
);
