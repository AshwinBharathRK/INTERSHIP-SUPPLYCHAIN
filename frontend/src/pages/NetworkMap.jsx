import React, { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { DeckGL } from "@deck.gl/react";
import { PathLayer, ScatterplotLayer } from "@deck.gl/layers";
import { Factory, Warehouse, Users, Route as RouteIcon, Ship as ShipIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { fetchers } from "@/lib/api";
import { RGB } from "@/lib/theme";
import { fmtCurrency, fmtNumber, fmtHours, fmtSimDate } from "@/lib/format";
import { SeverityBadge, StatusChip, ModeIcon } from "@/components/common/SeverityBadge";
import { Progress } from "@/components/ui/progress";
import { useWorldGeo, makeLandLayer } from "@/lib/useWorldGeo";
import { useApp } from "@/context/AppContext";

const INITIAL_VIEW = { longitude: 10, latitude: 30, zoom: 1.6, pitch: 0, bearing: 0, minZoom: 1, maxZoom: 9 };

const riskRGB = (level) => (level === "high" ? RGB.red : level === "medium" ? RGB.amber : RGB.green);

export default function NetworkMap() {
  const { theme } = useApp();
  const [layersOn, setLayersOn] = useState({ suppliers: true, warehouses: true, markets: true, routes: true, shipments: true });
  const [modeFilter, setModeFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const world = useWorldGeo();
  const { data: nodes } = useQuery({ queryKey: ["nodes"], queryFn: () => fetchers.nodes(), staleTime: Infinity });
  const { data: lanes } = useQuery({ queryKey: ["lanes"], queryFn: fetchers.lanes, staleTime: Infinity });
  const { data: shipments } = useQuery({
    queryKey: ["shipments", "transit"],
    queryFn: () => fetchers.shipments("?status=in_transit&limit=200"),
    refetchInterval: 4000,
  });
  const { data: risk } = useQuery({ queryKey: ["risk"], queryFn: fetchers.risk, refetchInterval: 30000 });
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: fetchers.warehouses, refetchInterval: 10000 });

  const riskMap = useMemo(() => Object.fromEntries((risk || []).map((r) => [r.code, r])), [risk]);
  const whMap = useMemo(() => Object.fromEntries((warehouses || []).map((w) => [w.code, w])), [warehouses]);
  const activeLaneIds = useMemo(() => new Set((shipments || []).map((s) => s.lane_id)), [shipments]);

  const filteredShipments = useMemo(
    () => (shipments || []).filter((s) => modeFilter === "all" || s.mode === modeFilter),
    [shipments, modeFilter]
  );

  const layers = useMemo(() => {
    const out = [makeLandLayer(world)];
    if (layersOn.routes && lanes) {
      const visible = lanes.filter((l) => activeLaneIds.has(l.id) && (modeFilter === "all" || l.mode === modeFilter));
      const dim = lanes.filter((l) => !activeLaneIds.has(l.id) && (modeFilter === "all" || l.mode === modeFilter));
      out.push(
        new PathLayer({
          id: "lanes-dim",
          data: dim,
          getPath: (d) => d.waypoints,
          getColor: [148, 163, 184, 22],
          getWidth: 1,
          widthUnits: "pixels",
        }),
        new PathLayer({
          id: "lanes-active",
          data: visible,
          getPath: (d) => d.waypoints,
          getColor: (d) => (d.mode === "air" ? [...RGB.blue, 120] : d.mode === "road" ? [...RGB.amber, 110] : [...RGB.cyan, 110]),
          getWidth: 2,
          widthUnits: "pixels",
          pickable: true,
          onClick: (info) => info.object && setSelected({ kind: "lane", data: info.object }),
        })
      );
    }
    if (nodes) {
      if (layersOn.markets) {
        out.push(
          new ScatterplotLayer({
            id: "markets",
            data: nodes.filter((n) => n.node_type === "market"),
            getPosition: (d) => [d.lon, d.lat],
            getFillColor: [...RGB.neutral, 140],
            getRadius: 4,
            radiusUnits: "pixels",
            pickable: true,
            onClick: (info) => info.object && setSelected({ kind: "market", data: info.object }),
          })
        );
      }
      if (layersOn.suppliers) {
        out.push(
          new ScatterplotLayer({
            id: "suppliers",
            data: nodes.filter((n) => n.node_type === "supplier"),
            getPosition: (d) => [d.lon, d.lat],
            getFillColor: (d) => [...riskRGB(riskMap[d.code]?.risk?.level), 210],
            getRadius: 6,
            radiusUnits: "pixels",
            stroked: true,
            getLineColor: [255, 255, 255, 70],
            lineWidthMinPixels: 1,
            pickable: true,
            onClick: (info) => info.object && setSelected({ kind: "supplier", data: info.object }),
            updateTriggers: { getFillColor: [riskMap] },
          })
        );
      }
      if (layersOn.warehouses) {
        out.push(
          new ScatterplotLayer({
            id: "warehouses",
            data: nodes.filter((n) => n.node_type === "warehouse"),
            getPosition: (d) => [d.lon, d.lat],
            getFillColor: [...RGB.cyan, 235],
            getRadius: 8,
            radiusUnits: "pixels",
            stroked: true,
            getLineColor: [255, 255, 255, 110],
            lineWidthMinPixels: 1.5,
            pickable: true,
            onClick: (info) => info.object && setSelected({ kind: "warehouse", data: info.object }),
          })
        );
      }
    }
    if (layersOn.shipments && filteredShipments.length) {
      out.push(
        new ScatterplotLayer({
          id: "shipments",
          data: filteredShipments,
          getPosition: (d) => d.position,
          getFillColor: (d) => (d.delay_hours > 0 ? [...RGB.red, 255] : d.mode === "air" ? [...RGB.blue, 255] : d.mode === "road" ? [...RGB.amber, 255] : [...RGB.cyan, 255]),
          getRadius: 5,
          radiusUnits: "pixels",
          stroked: true,
          getLineColor: [255, 255, 255, 160],
          lineWidthMinPixels: 1.5,
          pickable: true,
          onClick: (info) => info.object && setSelected({ kind: "shipment", data: info.object }),
          transitions: { getPosition: { duration: 3500 } },
        })
      );
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, lanes, filteredShipments, layersOn, modeFilter, riskMap, activeLaneIds, world, theme]);

  const getTooltip = useCallback(({ object, layer }) => {
    if (!object) return null;
    let html = "";
    if (layer.id === "shipments") {
      html = `<b>${object.sku}</b> · ${object.qty} units<br/>${object.supplier_code} → ${object.warehouse_code}<br/>${object.carrier} · ${Math.round(object.progress * 100)}% of route`;
    } else if (layer.id === "suppliers") {
      html = `<b>${object.name}</b><br/>${object.city}, ${object.country}`;
    } else if (layer.id === "warehouses") {
      html = `<b>${object.name}</b><br/>${object.city}, ${object.country}`;
    } else if (layer.id === "markets") {
      html = `<b>${object.name}</b><br/>Customer market`;
    } else if (layer.id === "lanes-active") {
      html = `<b>${object.supplier_code} → ${object.warehouse_code}</b><br/>${object.mode} · ${fmtNumber(object.distance_km)} km`;
    }
    return html ? { html: `<div style="font-size:11px;line-height:1.5">${html}</div>`, style: { backgroundColor: "hsl(222,22%,10%)", color: "#e2e8f0", borderRadius: "8px", padding: "8px 10px", border: "1px solid rgba(148,163,184,0.2)" } } : null;
  }, []);

  const toggles = [
    { key: "suppliers", label: "Suppliers", icon: Factory },
    { key: "warehouses", label: "Warehouses", icon: Warehouse },
    { key: "markets", label: "Markets", icon: Users },
    { key: "routes", label: "Routes", icon: RouteIcon },
    { key: "shipments", label: "Shipments", icon: ShipIcon },
  ];

  const sel = selected?.data;

  return (
    <div className="relative h-full w-full" style={{ background: "radial-gradient(1200px circle at 50% 10%, #0a1220 0%, #060a10 60%)" }} data-testid="network-map-page">
      <DeckGL initialViewState={INITIAL_VIEW} controller={true} layers={layers} getTooltip={getTooltip} style={{ position: "absolute", inset: 0 }} />

      {/* Layer controls */}
      <div className="absolute left-3 top-3 flex flex-col gap-2" data-testid="map-layer-controls">
        <div className="glass-panel-solid flex flex-wrap gap-1 p-1.5">
          {toggles.map((t) => (
            <button
              key={t.key}
              onClick={() => setLayersOn((o) => ({ ...o, [t.key]: !o[t.key] }))}
              data-testid={`map-toggle-${t.key}`}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-[background-color,color] duration-200 ${
                layersOn[t.key] ? "bg-[hsl(var(--primary)/0.16)] text-[hsl(var(--primary))]" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon size={12} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="glass-panel-solid flex gap-1 p-1.5">
          {["all", "sea", "air", "road"].map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              data-testid={`map-mode-${m}`}
              className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium capitalize transition-[background-color,color] duration-200 ${
                modeFilter === m ? "bg-[hsl(var(--primary)/0.16)] text-[hsl(var(--primary))]" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="glass-panel-solid absolute bottom-4 left-3 hidden gap-4 px-3.5 py-2.5 text-[11px] text-muted-foreground md:flex" data-testid="map-legend">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "rgb(34,211,238)" }} /> Warehouse / sea</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "rgb(56,152,236)" }} /> Air</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "rgb(245,158,11)" }} /> Road / medium risk</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "rgb(239,68,68)" }} /> Delayed / high risk</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "rgb(45,197,141)" }} /> Low-risk supplier</span>
      </div>

      {/* Live counter */}
      <div className="glass-panel-solid absolute right-3 top-3 flex items-center gap-2 px-3 py-2" data-testid="map-live-counter">
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
        <span className="text-[11px] text-muted-foreground">
          <span className="font-mono font-medium text-foreground">{filteredShipments.length}</span> shipments moving
        </span>
      </div>

      {/* Inspector */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full border-[hsl(var(--stroke-soft)/0.6)] bg-[hsl(var(--surface-1)/0.97)] sm:max-w-[420px]" data-testid="map-inspector">
          {selected?.kind === "shipment" && sel && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display flex items-center gap-2 text-base">
                  <ModeIcon mode={sel.mode} className="text-[hsl(var(--primary))]" /> {sel.sku} shipment
                </SheetTitle>
                <SheetDescription className="text-xs">{sel.supplier_code} → {sel.warehouse_code} · {sel.carrier}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="mb-1.5 flex justify-between text-xs"><span className="text-muted-foreground">Route progress</span><span className="font-mono">{Math.round(sel.progress * 100)}%</span></div>
                  <Progress value={sel.progress * 100} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <Info label="Quantity" value={`${fmtNumber(sel.qty, false)} units`} />
                  <Info label="Value" value={fmtCurrency(sel.value)} />
                  <Info label="Distance" value={`${fmtNumber(sel.distance_km)} km`} />
                  <Info label="ETA" value={fmtSimDate(sel.eta)} />
                  <Info label="Delay" value={sel.delay_hours > 0 ? `+${fmtHours(sel.delay_hours)}` : "On schedule"} tone={sel.delay_hours > 0 ? "warn" : "ok"} />
                  <Info label="Mode" value={sel.mode} />
                </div>
                {sel.delay_prediction && (
                  <div className="rounded-lg border border-[hsl(var(--stroke-soft)/0.5)] bg-[hsl(var(--surface-2)/0.5)] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Delay risk prediction</span>
                      <SeverityBadge severity={sel.delay_prediction.risk_level === "high" ? "critical" : sel.delay_prediction.risk_level === "medium" ? "warning" : "success"}>
                        {sel.delay_prediction.risk_level}
                      </SeverityBadge>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {Math.round(sel.delay_prediction.delay_probability * 100)}% probability of late arrival · expected impact +{fmtHours(sel.delay_prediction.expected_delay_hours)}.
                      Drivers: supplier on-time {Math.round(sel.delay_prediction.drivers.supplier_on_time_rate * 100)}%, {sel.mode} mode factor {sel.delay_prediction.drivers.mode_factor}x{sel.delay_prediction.drivers.already_delayed ? ", already delayed en route" : ""}.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
          {selected?.kind === "supplier" && sel && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-base">{sel.name}</SheetTitle>
                <SheetDescription className="text-xs">{sel.city}, {sel.country}</SheetDescription>
              </SheetHeader>
              {riskMap[sel.code] ? (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--stroke-soft)/0.5)] bg-[hsl(var(--surface-2)/0.5)] p-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Composite risk score</div>
                      <div className="font-display text-2xl font-semibold">{riskMap[sel.code].risk.score}<span className="text-sm text-muted-foreground">/100</span></div>
                    </div>
                    <StatusChip status={`${riskMap[sel.code].risk.level}_risk`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <Info label="On-time rate" value={`${Math.round(riskMap[sel.code].metrics.on_time_rate * 100)}%`} />
                    <Info label="Defect rate" value={`${(riskMap[sel.code].metrics.defect_rate * 100).toFixed(2)}%`} />
                    <Info label="Annual spend" value={fmtCurrency(riskMap[sel.code].total_spend)} />
                    <Info label="Active shipments" value={riskMap[sel.code].active_shipments} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Primary risk driver: <span className="text-foreground">{riskMap[sel.code].risk.primary_driver}</span>. Based on {riskMap[sel.code].metrics.shipments_analyzed} analyzed shipments.</p>
                  <div className="text-[11px] text-muted-foreground">Supplies: {riskMap[sel.code].skus.join(", ")}</div>
                </div>
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">Loading supplier intelligence…</p>
              )}
            </>
          )}
          {selected?.kind === "warehouse" && sel && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-base">{sel.name}</SheetTitle>
                <SheetDescription className="text-xs">{sel.city}, {sel.country} · {sel.docks} docks · {sel.zones} zones</SheetDescription>
              </SheetHeader>
              {whMap[sel.code] && (
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="mb-1.5 flex justify-between text-xs"><span className="text-muted-foreground">Capacity utilization</span><span className="font-mono">{whMap[sel.code].utilization_pct}%</span></div>
                    <Progress value={whMap[sel.code].utilization_pct} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <Info label="Units on hand" value={fmtNumber(whMap[sel.code].units, false)} />
                    <Info label="Stock value" value={fmtCurrency(whMap[sel.code].stock_value)} />
                    <Info label="SKUs" value={whMap[sel.code].skus} />
                    <Info label="Inbound shipments" value={whMap[sel.code].inbound_shipments} />
                  </div>
                </div>
              )}
            </>
          )}
          {selected?.kind === "market" && sel && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-base">{sel.name}</SheetTitle>
                <SheetDescription className="text-xs">Customer market · served by {sel.served_by}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <Info label="Region" value={sel.region?.replace("_", " ")} />
                <Info label="Demand weight" value={`${sel.weight}x`} />
              </div>
            </>
          )}
          {selected?.kind === "lane" && sel && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-base">{sel.supplier_code} → {sel.warehouse_code}</SheetTitle>
                <SheetDescription className="text-xs">Logistics lane · {sel.mode}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <Info label="Distance" value={`${fmtNumber(sel.distance_km)} km`} />
                <Info label="Transit time" value={fmtHours(sel.transit_hours)} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

const Info = ({ label, value, tone }) => (
  <div className="rounded-lg border border-[hsl(var(--stroke-soft)/0.4)] bg-[hsl(var(--surface-2)/0.35)] px-2.5 py-2">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className={`mt-0.5 text-xs font-medium capitalize ${tone === "warn" ? "text-[hsl(var(--warning))]" : tone === "ok" ? "text-[hsl(var(--success))]" : ""}`}>{value}</div>
  </div>
);
