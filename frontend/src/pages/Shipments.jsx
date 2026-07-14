import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Download, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { fetchers, exportUrl } from "@/lib/api";
import { fmtCurrency, fmtNumber, fmtHours, fmtSimDate } from "@/lib/format";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassPanel } from "@/components/common/GlassPanel";
import { SeverityBadge, StatusChip, ModeIcon } from "@/components/common/SeverityBadge";
import { RowsSkeleton } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { MiniMap } from "@/components/viz/MiniMap";

export default function Shipments() {
  const [status, setStatus] = useState("in_transit");
  const [mode, setMode] = useState("all");
  const [selectedId, setSelectedId] = useState(null);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (status !== "all") p.set("status", status);
    if (mode !== "all") p.set("mode", mode);
    p.set("limit", "150");
    return `?${p.toString()}`;
  }, [status, mode]);

  const { data: shipments, isLoading } = useQuery({
    queryKey: ["shipments", params],
    queryFn: () => fetchers.shipments(params),
    refetchInterval: 5000,
  });
  const { data: detail } = useQuery({
    queryKey: ["shipmentDetail", selectedId],
    queryFn: () => fetchers.shipmentDetail(selectedId),
    enabled: !!selectedId,
    refetchInterval: 6000,
  });

  return (
    <div className="mx-auto max-w-[1500px]" data-testid="shipments-page">
      <PageHeader
        title="Shipments & Logistics"
        subtitle="Live multi-modal shipment tracking with AI delay-risk predictions per consignment."
        actions={
          <Button variant="outline" size="sm" onClick={() => window.open(exportUrl("shipments"), "_blank")} data-testid="shipments-export-button" className="h-8 gap-1.5 border-[hsl(var(--stroke-soft))] text-xs">
            <Download size={13} /> Export CSV
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2" data-testid="shipments-filters">
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList className="bg-[hsl(var(--surface-2))]" data-testid="shipments-status-tabs">
            <TabsTrigger value="in_transit" className="text-xs" data-testid="shipments-tab-transit">In transit</TabsTrigger>
            <TabsTrigger value="delivered" className="text-xs" data-testid="shipments-tab-delivered">Delivered</TabsTrigger>
            <TabsTrigger value="all" className="text-xs" data-testid="shipments-tab-all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-1 rounded-lg border border-[hsl(var(--stroke-soft)/0.6)] bg-[hsl(var(--surface-2)/0.5)] p-1">
          {["all", "sea", "air", "road"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              data-testid={`shipments-mode-${m}`}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize ${mode === m ? "bg-[hsl(var(--primary)/0.16)] text-[hsl(var(--primary))]" : "text-muted-foreground hover:text-foreground"}`}
            >
              {m}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[11px] text-muted-foreground">{shipments ? `${shipments.length} shipments` : ""}</span>
      </div>

      <div className="mt-3 space-y-2" data-testid="shipment-list">
        {isLoading && <RowsSkeleton rows={8} />}
        {shipments && shipments.length === 0 && (
          <GlassPanel solid><EmptyState icon={PackageSearch} title="No shipments match" description="Try a different status or mode filter." /></GlassPanel>
        )}
        {(shipments || []).map((s, i) => (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.4), duration: 0.35 }}
            onClick={() => setSelectedId(s.id)}
            className="glass-panel-solid grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 p-3 text-left transition-[border-color] duration-200 hover:border-[hsl(var(--primary)/0.4)] md:grid-cols-[auto_2fr_1.4fr_1fr_auto]"
            data-testid="shipment-row"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--surface-2))]">
              <ModeIcon mode={s.mode} size={15} className={s.delay_hours > 0 ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--primary))]"} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium text-[hsl(var(--primary))]">{s.sku}</span>
                <span className="text-xs text-muted-foreground">{fmtNumber(s.qty, false)} units · {fmtCurrency(s.value)}</span>
              </div>
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {s.supplier_code} → {s.warehouse_code} · {s.carrier}
              </div>
            </div>
            <div className="hidden md:block">
              {s.status === "in_transit" ? (
                <div className="space-y-1" data-testid="shipment-progress">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{Math.round(s.progress * 100)}% of {fmtNumber(s.distance_km)} km</span>
                    <span>ETA {fmtSimDate(s.eta)}</span>
                  </div>
                  <Progress value={s.progress * 100} className="h-1.5" />
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground">Delivered {fmtSimDate(s.delivered_at)}</span>
              )}
            </div>
            <div className="hidden md:flex md:justify-center">
              {s.status === "in_transit" && s.delay_prediction ? (
                <SeverityBadge severity={s.delay_prediction.risk_level === "high" ? "critical" : s.delay_prediction.risk_level === "medium" ? "warning" : "success"}>
                  {Math.round(s.delay_prediction.delay_probability * 100)}% delay risk
                </SeverityBadge>
              ) : s.status === "delivered" ? (
                <StatusChip status={s.on_time ? "delivered" : "critical"} label={s.on_time ? "On time" : `Late +${fmtHours(s.delay_hours)}`} />
              ) : null}
            </div>
            <StatusChip status={s.status} />
          </motion.button>
        ))}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto border-[hsl(var(--stroke-soft)/0.6)] bg-[hsl(var(--surface-1)/0.97)] sm:max-w-[480px]" data-testid="shipment-detail-sheet">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display flex items-center gap-2 text-base">
                  <ModeIcon mode={detail.mode} className="text-[hsl(var(--primary))]" /> {detail.sku} · {fmtNumber(detail.qty, false)} units
                </SheetTitle>
                <SheetDescription className="text-xs">{detail.supplier_code} → {detail.warehouse_code} · {detail.carrier}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <MiniMap waypoints={detail.waypoints} position={detail.position} mode={detail.mode} height={210} />
                {detail.status === "in_transit" && (
                  <div>
                    <div className="mb-1.5 flex justify-between text-xs"><span className="text-muted-foreground">Route progress</span><span className="font-mono">{Math.round(detail.progress * 100)}%</span></div>
                    <Progress value={detail.progress * 100} className="h-2" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Cell label="Value" value={fmtCurrency(detail.value)} />
                  <Cell label="Distance" value={`${fmtNumber(detail.distance_km)} km`} />
                  <Cell label="Departed" value={fmtSimDate(detail.departed_at)} />
                  <Cell label={detail.status === "delivered" ? "Delivered" : "ETA"} value={fmtSimDate(detail.delivered_at || detail.eta)} />
                  <Cell label="Planned transit" value={fmtHours(detail.planned_hours)} />
                  <Cell label="Delay" value={detail.delay_hours > 0 ? `+${fmtHours(detail.delay_hours)}` : "None"} />
                </div>
                {detail.delay_prediction && (
                  <div className="rounded-lg border border-[hsl(var(--stroke-soft)/0.5)] bg-[hsl(var(--surface-2)/0.5)] p-3" data-testid="delay-prediction-panel">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">AI delay prediction</span>
                      <SeverityBadge severity={detail.delay_prediction.risk_level === "high" ? "critical" : detail.delay_prediction.risk_level === "medium" ? "warning" : "success"}>
                        {detail.delay_prediction.risk_level} risk
                      </SeverityBadge>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      {Math.round(detail.delay_prediction.delay_probability * 100)}% probability of late arrival, expected impact +{fmtHours(detail.delay_prediction.expected_delay_hours)}. Based on carrier-lane history: supplier on-time rate {Math.round(detail.delay_prediction.drivers.supplier_on_time_rate * 100)}%, {detail.mode} volatility factor {detail.delay_prediction.drivers.mode_factor}x{detail.delay_prediction.drivers.already_delayed ? ", incident already recorded en route" : ""}.
                    </p>
                  </div>
                )}
                {detail.purchase_order && (
                  <div className="rounded-lg border border-[hsl(var(--stroke-soft)/0.5)] bg-[hsl(var(--surface-2)/0.5)] p-3">
                    <span className="text-xs font-medium">Purchase order</span>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <Cell label="PO value" value={fmtCurrency(detail.purchase_order.total_cost)} />
                      <Cell label="Unit cost" value={`$${detail.purchase_order.unit_cost}`} />
                      <Cell label="Status" value={detail.purchase_order.status.replace("_", " ")} />
                      <Cell label="Created" value={fmtSimDate(detail.purchase_order.created_at)} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

const Cell = ({ label, value }) => (
  <div className="rounded-lg border border-[hsl(var(--stroke-soft)/0.4)] bg-[hsl(var(--surface-2)/0.35)] px-2.5 py-2">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="mt-0.5 text-xs font-medium capitalize">{value}</div>
  </div>
);
