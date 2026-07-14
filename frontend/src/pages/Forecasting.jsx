import React, { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchers } from "@/lib/api";
import { shortDate, fmtNumber } from "@/lib/format";
import { C, chartTooltipStyle } from "@/lib/theme";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassPanel, PanelHeader } from "@/components/common/GlassPanel";
import { PanelSkeleton } from "@/components/common/LoadingState";
import { StatusChip } from "@/components/common/SeverityBadge";
import { BrainCircuit, Target, TrendingUp, History } from "lucide-react";

export default function Forecasting() {
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: fetchers.products, staleTime: Infinity });
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: fetchers.warehouses, staleTime: 60000 });

  const [productId, setProductId] = useState(null);
  const [warehouseId, setWarehouseId] = useState("all");
  const [horizon, setHorizon] = useState("30");

  useEffect(() => {
    if (!productId && products?.length) setProductId(products[0].id);
  }, [products, productId]);

  const { data: fc, isFetching } = useQuery({
    queryKey: ["forecast", productId, warehouseId, horizon],
    queryFn: () => fetchers.forecast(productId, warehouseId === "all" ? null : warehouseId, Number(horizon)),
    enabled: !!productId,
    keepPreviousData: true,
  });

  const chartData = useMemo(() => {
    if (!fc) return [];
    const hist = fc.history.slice(-90).map((h) => ({ date: h.date, actual: h.qty }));
    const last = hist[hist.length - 1];
    const fut = fc.dates.map((d, i) => ({
      date: d,
      forecast: fc.forecast[i],
      band: [fc.lower[i], fc.upper[i]],
    }));
    // bridge line continuity
    if (last) fut.unshift({ date: last.date, forecast: last.actual, band: [last.actual, last.actual] });
    return [...hist, ...fut];
  }, [fc]);

  const splitDate = fc?.history?.length ? fc.history[fc.history.length - 1].date : null;

  return (
    <div className="mx-auto max-w-[1500px]" data-testid="forecasting-page">
      <PageHeader
        title="Demand Forecasting Studio"
        subtitle="Holt-Winters exponential smoothing fitted on live demand history — with confidence bands and holdout accuracy."
      />

      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-4">
        {/* Controls + metrics */}
        <div className="space-y-4">
          <GlassPanel solid className="space-y-3 p-4">
            <PanelHeader title="Model inputs" />
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Product</label>
              <Select value={productId || ""} onValueChange={setProductId}>
                <SelectTrigger className="h-9 border-[hsl(var(--stroke-soft))] bg-[hsl(var(--surface-2)/0.5)] text-xs" data-testid="forecast-product-select">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {(products || []).map((p) => (
                    <SelectItem key={p.id} value={p.id} data-testid={`forecast-product-${p.sku}`}>
                      {p.sku} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Warehouse</label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger className="h-9 border-[hsl(var(--stroke-soft))] bg-[hsl(var(--surface-2)/0.5)] text-xs" data-testid="forecast-warehouse-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All warehouses (network)</SelectItem>
                  {(warehouses || []).map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.code} — {w.city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Horizon</label>
              <Tabs value={horizon} onValueChange={setHorizon}>
                <TabsList className="grid w-full grid-cols-3 bg-[hsl(var(--surface-2))]" data-testid="forecast-horizon-tabs">
                  <TabsTrigger value="14" className="text-xs">14d</TabsTrigger>
                  <TabsTrigger value="30" className="text-xs">30d</TabsTrigger>
                  <TabsTrigger value="60" className="text-xs">60d</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </GlassPanel>

          <GlassPanel solid className="space-y-3 p-4" data-testid="forecast-metrics">
            <PanelHeader title="Model diagnostics" />
            <Metric icon={BrainCircuit} label="Model" value={fc?.model === "holt_winters" ? "Holt-Winters (add. trend + weekly seasonality)" : fc?.model === "ewma" ? "EWMA fallback" : "—"} />
            <Metric icon={Target} label="Holdout MAPE (14d)" value={fc?.mape != null ? `${fc.mape}%` : "—"} good={fc?.mape != null && fc.mape < 35} />
            <Metric icon={TrendingUp} label="Demand trend (30d)" value={fc ? `${fc.trend_pct_30d > 0 ? "+" : ""}${fc.trend_pct_30d}%` : "—"} />
            <Metric icon={History} label="History used" value={fc ? `${fc.history_days} days` : "—"} />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              The model is re-fitted on demand history that includes live simulation data. Confidence band shows the 80% interval widening with horizon uncertainty.
            </p>
          </GlassPanel>
        </div>

        {/* Chart */}
        <GlassPanel solid className="p-4 md:p-5 xl:col-span-3" data-testid="forecast-chart-panel">
          <PanelHeader
            title={fc?.product ? `${fc.product.sku} — ${fc.product.name}` : "Forecast"}
            subtitle={fc ? `Avg daily demand ${fc.avg_daily} units · ${warehouseId === "all" ? "network-wide" : "single DC"}` : ""}
            action={fc?.model && <StatusChip status={fc.model === "holt_winters" ? "A" : "B"} label={fc.model === "holt_winters" ? "HW model" : "EWMA"} />}
          />
          <div className={`mt-4 h-[440px] transition-opacity duration-300 ${isFetching ? "opacity-50" : ""}`}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: C.neutral, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={50} />
                  <YAxis tick={{ fill: C.neutral, fontSize: 11 }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => fmtNumber(v)} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    labelFormatter={shortDate}
                    formatter={(v, name) => {
                      if (name === "band") return [`${fmtNumber(v[0], false)} – ${fmtNumber(v[1], false)}`, "80% interval"];
                      return [fmtNumber(v, false), name === "actual" ? "Actual demand" : "Forecast"];
                    }}
                  />
                  <Area type="monotone" dataKey="band" stroke="none" fill={C.cyan} fillOpacity={0.12} animationDuration={700} connectNulls={false} />
                  <Line type="monotone" dataKey="actual" stroke={C.neutral} strokeWidth={1.6} dot={false} animationDuration={700} />
                  <Line type="monotone" dataKey="forecast" stroke={C.cyan} strokeWidth={2.2} strokeDasharray="6 3" dot={false} animationDuration={700} />
                  {splitDate && <ReferenceLine x={splitDate} stroke={C.amber} strokeDasharray="3 3" label={{ value: "today", fill: C.amber, fontSize: 10, position: "top" }} />}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <PanelSkeleton className="h-full" />
            )}
          </div>
          <div className="mt-2 flex gap-5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-5" style={{ background: C.neutral }} /> Actual (fulfilled demand)</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t-2 border-dashed" style={{ borderColor: C.cyan }} /> Forecast</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-sm" style={{ background: "rgba(34,211,238,0.15)" }} /> 80% confidence band</span>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

const Metric = ({ icon: Icon, label, value, good }) => (
  <div className="flex items-start gap-2.5">
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
      <Icon size={13} />
    </span>
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xs font-medium ${good ? "text-[hsl(var(--success))]" : ""}`}>{value}</div>
    </div>
  </div>
);
