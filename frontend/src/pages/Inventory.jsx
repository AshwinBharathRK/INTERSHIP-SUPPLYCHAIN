import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search, PackageOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { fetchers, exportUrl } from "@/lib/api";
import { fmtCurrency, fmtNumber } from "@/lib/format";
import { PageHeader } from "@/components/common/PageHeader";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusChip } from "@/components/common/SeverityBadge";
import { RowsSkeleton } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { GlassPanel } from "@/components/common/GlassPanel";
import { DollarSign, Layers, CalendarClock, AlertTriangle } from "lucide-react";

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState("all");
  const [abc, setAbc] = useState("all");
  const [sort, setSort] = useState("risk");
  const [selected, setSelected] = useState(null);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (warehouse !== "all") p.set("warehouse", warehouse);
    if (search) p.set("search", search);
    if (abc !== "all") p.set("abc", abc);
    p.set("sort", sort);
    return `?${p.toString()}`;
  }, [warehouse, search, abc, sort]);

  const { data: items, isLoading } = useQuery({
    queryKey: ["inventory", params],
    queryFn: () => fetchers.inventory(params),
    refetchInterval: 8000,
  });
  const { data: summary } = useQuery({ queryKey: ["invSummary"], queryFn: fetchers.inventorySummary, refetchInterval: 8000 });
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: fetchers.warehouses, staleTime: 60000 });
  const { data: optData } = useQuery({
    queryKey: ["optimization", selected?.sku, selected?.warehouse_code],
    queryFn: () => fetchers.optimization(selected.sku, selected.warehouse_code),
    enabled: !!selected,
  });

  return (
    <div className="mx-auto max-w-[1600px]" data-testid="inventory-page">
      <PageHeader
        title="Inventory & Optimization"
        subtitle="Live stock positions with EOQ, safety stock and stockout-risk analytics computed from real demand history."
        actions={
          <Button variant="outline" size="sm" onClick={() => window.open(exportUrl("inventory"), "_blank")} data-testid="inventory-export-button" className="h-8 gap-1.5 border-[hsl(var(--stroke-soft))] text-xs">
            <Download size={13} /> Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <KpiCard index={0} label="Total Stock Value" value={summary?.total_value} format={(v) => fmtCurrency(v)} icon={DollarSign} testId="inv-kpi-value" />
        <KpiCard index={1} label="Units on Hand" value={summary?.total_units} format={(v) => fmtNumber(v)} icon={Layers} testId="inv-kpi-units" />
        <KpiCard index={2} label="Avg Days of Supply" value={summary?.avg_days_of_supply} format={(v) => v.toFixed(1)} icon={CalendarClock} testId="inv-kpi-dos" />
        <KpiCard index={3} label="High-Risk Positions" value={summary?.high_risk_items} format={(v) => fmtNumber(v, false)} icon={AlertTriangle} tone={summary?.high_risk_items > 0 ? "critical" : "default"} testId="inv-kpi-risk" />
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-10 mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[hsl(var(--stroke-soft)/0.5)] bg-[hsl(var(--surface-1)/0.9)] p-2.5 backdrop-blur-md md:mt-6" data-testid="filters-bar">
        <div className="relative min-w-[180px] flex-1 md:max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU or product…"
            data-testid="inventory-search-input"
            className="h-9 border-[hsl(var(--stroke-soft))] bg-[hsl(var(--surface-2)/0.5)] pl-8 text-xs"
          />
        </div>
        <Select value={warehouse} onValueChange={setWarehouse}>
          <SelectTrigger className="h-9 w-[150px] border-[hsl(var(--stroke-soft))] bg-[hsl(var(--surface-2)/0.5)] text-xs" data-testid="inventory-warehouse-select">
            <SelectValue placeholder="Warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All warehouses</SelectItem>
            {(warehouses || []).map((w) => (
              <SelectItem key={w.code} value={w.code}>{w.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={abc} onValueChange={setAbc}>
          <SelectTrigger className="h-9 w-[120px] border-[hsl(var(--stroke-soft))] bg-[hsl(var(--surface-2)/0.5)] text-xs" data-testid="inventory-abc-select">
            <SelectValue placeholder="ABC" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            <SelectItem value="A">Class A</SelectItem>
            <SelectItem value="B">Class B</SelectItem>
            <SelectItem value="C">Class C</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-9 w-[150px] border-[hsl(var(--stroke-soft))] bg-[hsl(var(--surface-2)/0.5)] text-xs" data-testid="inventory-sort-select">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="risk">Sort: stockout risk</SelectItem>
            <SelectItem value="value">Sort: stock value</SelectItem>
            <SelectItem value="dos">Sort: days of supply</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto hidden text-[11px] text-muted-foreground md:block" data-testid="inventory-count">
          {items ? `${items.length} positions` : "…"}
        </span>
      </div>

      {/* Table */}
      <GlassPanel solid className="mt-3 overflow-hidden">
        {isLoading ? (
          <div className="p-4"><RowsSkeleton rows={10} /></div>
        ) : items && items.length > 0 ? (
          <div className="max-h-[620px] overflow-auto">
            <Table data-testid="inventory-table">
              <TableHeader className="sticky top-0 z-10 bg-[hsl(var(--surface-2))]">
                <TableRow className="border-[hsl(var(--stroke-soft)/0.5)] hover:bg-transparent">
                  {["SKU", "Product", "DC", "On hand", "Inbound", "Days supply", "Stockout risk", "ABC", "Status", "Value"].map((h) => (
                    <TableHead key={h} className="h-9 whitespace-nowrap text-[11px] uppercase tracking-wider text-muted-foreground">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow
                    key={it.id}
                    onClick={() => setSelected(it)}
                    data-testid="inventory-row"
                    className="cursor-pointer border-[hsl(var(--stroke-soft)/0.35)] transition-colors hover:bg-[hsl(var(--surface-2)/0.7)]"
                  >
                    <TableCell className="font-mono text-xs text-[hsl(var(--primary))]">{it.sku}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs">{it.product_name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{it.warehouse_code}</TableCell>
                    <TableCell className="text-xs tabular-nums">{fmtNumber(it.on_hand, false)}</TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">{it.on_order > 0 ? `+${fmtNumber(it.on_order, false)}` : "—"}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      <span className={it.days_of_supply < it.lead_time_days ? "text-[hsl(var(--warning))]" : ""}>{it.days_of_supply}d</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(it.stockout_probability * 100, 2)}%`,
                              background: it.stockout_probability > 0.5 ? "hsl(var(--critical))" : it.stockout_probability > 0.2 ? "hsl(var(--warning))" : "hsl(var(--success))",
                            }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">{Math.round(it.stockout_probability * 100)}%</span>
                      </div>
                    </TableCell>
                    <TableCell><StatusChip status={it.abc_class} /></TableCell>
                    <TableCell><StatusChip status={it.status} /></TableCell>
                    <TableCell className="text-xs tabular-nums">{fmtCurrency(it.stock_value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState icon={PackageOpen} title="No inventory positions match" description="Adjust your filters or search query." />
        )}
      </GlassPanel>

      {/* Optimization inspector */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto border-[hsl(var(--stroke-soft)/0.6)] bg-[hsl(var(--surface-1)/0.97)] sm:max-w-[460px]" data-testid="optimization-sheet">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-base">{selected.sku} @ {selected.warehouse_code}</SheetTitle>
                <SheetDescription className="text-xs">{selected.product_name} · {selected.category}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="On hand" value={fmtNumber(selected.on_hand, false)} />
                  <MiniStat label="Reorder point" value={fmtNumber(selected.reorder_point, false)} />
                  <MiniStat label="Inbound" value={fmtNumber(selected.on_order, false)} />
                </div>
                {optData ? (
                  <>
                    <div className="rounded-lg border border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.06)] p-3">
                      <h4 className="text-xs font-semibold text-[hsl(var(--primary))]">Optimization recommendation</h4>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                        <div><div className="font-display text-lg font-semibold tabular-nums">{fmtNumber(optData.optimization.eoq, false)}</div><div className="text-[9px] uppercase tracking-wider text-muted-foreground">EOQ units</div></div>
                        <div><div className="font-display text-lg font-semibold tabular-nums">{fmtNumber(optData.optimization.safety_stock, false)}</div><div className="text-[9px] uppercase tracking-wider text-muted-foreground">Safety stock</div></div>
                        <div><div className="font-display text-lg font-semibold tabular-nums">{fmtNumber(optData.optimization.reorder_point, false)}</div><div className="text-[9px] uppercase tracking-wider text-muted-foreground">Reorder point</div></div>
                      </div>
                    </div>
                    <div className="space-y-2" data-testid="optimization-explanations">
                      <h4 className="text-xs font-semibold">How these were computed</h4>
                      {Object.entries(optData.optimization.explanation).map(([k, v]) => (
                        <div key={k} className="rounded-lg border border-[hsl(var(--stroke-soft)/0.4)] bg-[hsl(var(--surface-2)/0.35)] px-2.5 py-2">
                          <div className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--primary))]">{k.replace("_", " ")}</div>
                          <div className="mt-0.5 font-mono text-[10.5px] leading-relaxed text-muted-foreground">{v}</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <MiniStat label="Stockout probability" value={`${Math.round(optData.optimization.stockout_probability * 100)}%`} />
                      <MiniStat label="Days of supply" value={`${optData.optimization.days_of_supply}d`} />
                      <MiniStat label="Annual demand" value={fmtNumber(optData.optimization.annual_demand)} />
                      <MiniStat label="Replenishment mode" value={optData.mode} />
                    </div>
                  </>
                ) : (
                  <RowsSkeleton rows={5} />
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

const MiniStat = ({ label, value }) => (
  <div className="rounded-lg border border-[hsl(var(--stroke-soft)/0.4)] bg-[hsl(var(--surface-2)/0.35)] px-2.5 py-2">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="mt-0.5 text-xs font-medium capitalize">{value}</div>
  </div>
);
