import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Download, LayoutGrid, TableProperties, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { fetchers, exportUrl } from "@/lib/api";
import { fmtCurrency, fmtHours } from "@/lib/format";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassPanel } from "@/components/common/GlassPanel";
import { RiskGauge } from "@/components/common/RiskGauge";
import { StatusChip } from "@/components/common/SeverityBadge";
import { RowsSkeleton } from "@/components/common/LoadingState";

const FACTOR_LABELS = {
  on_time: "On-time delivery",
  defects: "Quality defects",
  lead_variance: "Lead-time variance",
  geo: "Geopolitical",
  concentration: "Single-source",
};

export default function Suppliers() {
  const [view, setView] = useState("cards");
  const [selected, setSelected] = useState(null);
  const { data: suppliers, isLoading } = useQuery({ queryKey: ["risk"], queryFn: fetchers.risk, refetchInterval: 20000 });

  return (
    <div className="mx-auto max-w-[1600px]" data-testid="suppliers-page">
      <PageHeader
        title="Suppliers & Risk Intelligence"
        subtitle="Composite risk scores computed from real shipment performance, quality history, lead-time variance and network exposure."
        actions={
          <>
            <div className="flex rounded-lg border border-[hsl(var(--stroke-soft))] p-0.5">
              <button onClick={() => setView("cards")} data-testid="suppliers-view-cards" className={`rounded-md p-1.5 ${view === "cards" ? "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]" : "text-muted-foreground"}`}>
                <LayoutGrid size={14} />
              </button>
              <button onClick={() => setView("table")} data-testid="suppliers-view-table" className={`rounded-md p-1.5 ${view === "table" ? "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]" : "text-muted-foreground"}`}>
                <TableProperties size={14} />
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.open(exportUrl("suppliers"), "_blank")} data-testid="suppliers-export-button" className="h-8 gap-1.5 border-[hsl(var(--stroke-soft))] text-xs">
              <Download size={13} /> Export CSV
            </Button>
          </>
        }
      />

      {isLoading && <RowsSkeleton rows={8} />}

      {view === "cards" && suppliers && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="suppliers-grid">
          {suppliers.map((s, i) => (
            <motion.button
              key={s.code}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -2 }}
              onClick={() => setSelected(s)}
              className="glass-panel rim-light relative p-4 text-left"
              data-testid="supplier-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Factory size={13} className="shrink-0 text-muted-foreground" />
                    <h3 className="truncate text-sm font-semibold">{s.name}</h3>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{s.city}, {s.country} · {s.skus.length} SKUs · {fmtCurrency(s.total_spend)} spend</p>
                  <div className="mt-2"><StatusChip status={`${s.risk.level}_risk`} label={`${s.risk.level} risk`} /></div>
                </div>
                <RiskGauge score={s.risk.score} level={s.risk.level} size={76} />
              </div>
              <div className="mt-3 space-y-1.5">
                {Object.entries(s.risk.factors).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 text-[10px] text-muted-foreground">{FACTOR_LABELS[k]}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: v > 60 ? "hsl(var(--critical))" : v > 30 ? "hsl(var(--warning))" : "hsl(var(--success))" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${v}%` }}
                        transition={{ duration: 0.7, delay: 0.2 + i * 0.03 }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right font-mono text-[10px] text-muted-foreground">{Math.round(v)}</span>
                  </div>
                ))}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {view === "table" && suppliers && (
        <GlassPanel solid className="overflow-hidden">
          <Table data-testid="supplier-table">
            <TableHeader className="bg-[hsl(var(--surface-2))]">
              <TableRow className="border-[hsl(var(--stroke-soft)/0.5)] hover:bg-transparent">
                {["Supplier", "Location", "Risk", "Level", "On-time", "Defects", "Lead CV", "Avg delay", "Spend", "SKUs"].map((h) => (
                  <TableHead key={h} className="h-9 text-[11px] uppercase tracking-wider text-muted-foreground">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.code} onClick={() => setSelected(s)} className="cursor-pointer border-[hsl(var(--stroke-soft)/0.35)] hover:bg-[hsl(var(--surface-2)/0.7)]" data-testid="supplier-row">
                  <TableCell className="text-xs font-medium">{s.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.city}, {s.country}</TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">{s.risk.score}</TableCell>
                  <TableCell><StatusChip status={`${s.risk.level}_risk`} /></TableCell>
                  <TableCell className="text-xs tabular-nums">{Math.round(s.metrics.on_time_rate * 100)}%</TableCell>
                  <TableCell className="text-xs tabular-nums">{(s.metrics.defect_rate * 100).toFixed(2)}%</TableCell>
                  <TableCell className="text-xs tabular-nums">{s.metrics.lead_time_cv}</TableCell>
                  <TableCell className="text-xs tabular-nums">{fmtHours(s.metrics.avg_delay_hours)}</TableCell>
                  <TableCell className="text-xs tabular-nums">{fmtCurrency(s.total_spend)}</TableCell>
                  <TableCell className="text-xs tabular-nums">{s.skus.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </GlassPanel>
      )}

      {/* Supplier inspector */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto border-[hsl(var(--stroke-soft)/0.6)] bg-[hsl(var(--surface-1)/0.97)] sm:max-w-[460px]" data-testid="supplier-inspector">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-base">{selected.name}</SheetTitle>
                <SheetDescription className="text-xs">{selected.city}, {selected.country} · {selected.code}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--stroke-soft)/0.5)] bg-[hsl(var(--surface-2)/0.5)] p-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Composite risk</div>
                    <div className="font-display text-3xl font-semibold">{selected.risk.score}<span className="text-base text-muted-foreground">/100</span></div>
                    <div className="mt-1"><StatusChip status={`${selected.risk.level}_risk`} label={`${selected.risk.level} risk`} /></div>
                  </div>
                  <RiskGauge score={selected.risk.score} level={selected.risk.level} size={92} />
                </div>

                <div className="rounded-lg border border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.06)] p-3" data-testid="risk-explanation">
                  <h4 className="text-xs font-semibold text-[hsl(var(--primary))]">Explainable scoring</h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    Primary driver: <span className="text-foreground">{selected.risk.primary_driver}</span>. Score is a weighted blend of five factors computed from {selected.metrics.shipments_analyzed} historical shipments and purchase orders.
                  </p>
                  <div className="mt-3 space-y-1.5">
                    {Object.entries(selected.risk.contributions).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 text-[11px]">
                        <span className="w-32 shrink-0 text-muted-foreground">{FACTOR_LABELS[k]}</span>
                        <span className="font-mono text-muted-foreground">w={selected.risk.weights[k]}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
                          <div className="h-full rounded-full bg-[hsl(var(--primary))]" style={{ width: `${(v / selected.risk.score) * 100}%` }} />
                        </div>
                        <span className="w-8 text-right font-mono">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Cell label="On-time rate" value={`${Math.round(selected.metrics.on_time_rate * 100)}%`} />
                  <Cell label="Defect rate" value={`${(selected.metrics.defect_rate * 100).toFixed(2)}%`} />
                  <Cell label="Lead-time CV" value={selected.metrics.lead_time_cv} />
                  <Cell label="Avg delay" value={fmtHours(selected.metrics.avg_delay_hours)} />
                  <Cell label="Annual spend" value={fmtCurrency(selected.total_spend)} />
                  <Cell label="Active shipments" value={selected.active_shipments} />
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold">Supplied SKUs ({selected.skus.length})</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.skus.map((sku) => (
                      <span key={sku} className="rounded-md border border-[hsl(var(--stroke-soft)/0.5)] bg-[hsl(var(--surface-2)/0.5)] px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{sku}</span>
                    ))}
                  </div>
                </div>
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
    <div className="mt-0.5 text-xs font-medium">{value}</div>
  </div>
);
