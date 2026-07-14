import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  DollarSign,
  Package,
  Gauge,
  Clock,
  Ship,
  AlertTriangle,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchers } from "@/lib/api";
import { fmtCurrency, fmtNumber, fmtPct, shortDate } from "@/lib/format";
import { C, chartTooltipStyle } from "@/lib/theme";
import { KpiCard } from "@/components/common/KpiCard";
import { GlassPanel, PanelHeader } from "@/components/common/GlassPanel";
import { PageHeader } from "@/components/common/PageHeader";
import { EventStream } from "@/components/viz/EventStream";
import { SeverityBadge } from "@/components/common/SeverityBadge";
import { PanelSkeleton, RowsSkeleton } from "@/components/common/LoadingState";

export default function CommandCenter() {
  const { data: kpis } = useQuery({ queryKey: ["kpis"], queryFn: fetchers.kpis, refetchInterval: 4000 });
  const { data: events } = useQuery({ queryKey: ["events"], queryFn: () => fetchers.events(40), refetchInterval: 5000 });
  const { data: insights } = useQuery({ queryKey: ["insights"], queryFn: fetchers.insights, refetchInterval: 15000 });
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: fetchers.warehouses, refetchInterval: 10000 });

  const spark = (kpis?.revenue_sparkline || []).map((d) => ({ v: d.revenue }));
  const revSeries = (kpis?.revenue_sparkline || []).map((d) => ({
    date: shortDate(d.date),
    revenue: d.revenue,
    units: d.units,
  }));

  return (
    <div className="mx-auto max-w-[1600px]" data-testid="command-center-page">
      <PageHeader
        title="Network Command Center"
        subtitle="Live operational picture of your global supply chain — every metric computed from the running digital twin."
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-6" data-testid="kpi-grid">
        <KpiCard index={0} label="Inventory Value" value={kpis?.inventory_value} format={(v) => fmtCurrency(v)} icon={DollarSign} testId="kpi-inventory-value" />
        <KpiCard index={1} label="Revenue (30d)" value={kpis?.revenue_30d} format={(v) => fmtCurrency(v)} delta={kpis?.revenue_trend_pct} deltaLabel="vs previous 30 days" icon={Gauge} spark={spark} testId="kpi-revenue" />
        <KpiCard index={2} label="Fill Rate (14d)" value={kpis?.fill_rate} format={(v) => fmtPct(v)} icon={Package} testId="kpi-fill-rate" tone={kpis?.fill_rate < 95 ? "warning" : "default"} />
        <KpiCard index={3} label="On-Time Delivery" value={kpis?.on_time_delivery_rate} format={(v) => fmtPct(v)} deltaLabel={`${kpis?.deliveries_analyzed || 0} deliveries analyzed`} icon={Clock} testId="kpi-otd" />
        <KpiCard index={4} label="In Transit" value={kpis?.in_transit_count} format={(v) => fmtNumber(v, false)} deltaLabel={`${fmtCurrency(kpis?.in_transit_value)} moving`} icon={Ship} testId="kpi-in-transit" />
        <KpiCard index={5} label="SKUs at Risk" value={kpis?.skus_at_risk} format={(v) => fmtNumber(v, false)} deltaLabel={`${kpis?.stockout_events || 0} stockout events`} icon={AlertTriangle} tone={kpis?.skus_at_risk > 0 ? "critical" : "default"} testId="kpi-skus-at-risk" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:mt-6 md:gap-6 xl:grid-cols-3">
        {/* Left column: charts */}
        <div className="space-y-4 md:space-y-6 xl:col-span-2">
          <GlassPanel solid className="p-4 md:p-5" data-testid="revenue-chart-panel">
            <PanelHeader title="Demand Revenue — trailing 30 days" subtitle="Daily fulfilled revenue across all distribution centers (simulation-live)" />
            <div className="mt-4 h-[240px]">
              {revSeries.length > 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revSeries} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.cyan} stopOpacity={0.45} />
                        <stop offset="50%" stopColor={C.blue} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={C.blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: C.neutral, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={40} />
                    <YAxis tickFormatter={(v) => fmtCurrency(v)} tick={{ fill: C.neutral, fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(v, name) => [name === "revenue" ? fmtCurrency(v, false) : fmtNumber(v, false), name === "revenue" ? "Revenue" : "Units"]} />
                    <Area type="monotone" dataKey="revenue" stroke={C.cyan} strokeWidth={2.5} fill="url(#revGrad)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <PanelSkeleton className="h-full" />
              )}
            </div>
          </GlassPanel>
 
          <GlassPanel solid className="p-4 md:p-5" data-testid="warehouse-utilization-panel">
            <PanelHeader
              title="Distribution Center Utilization"
              subtitle="Units on hand vs rated capacity"
              action={
                <Link to="/warehouse" className="flex items-center gap-1 text-xs text-[hsl(var(--primary))] hover:underline" data-testid="view-3d-link">
                  Explore in 3D <ArrowRight size={12} />
                </Link>
              }
            />
            <div className="mt-4 space-y-3">
              {(warehouses || []).map((w, i) => (
                <motion.div key={w.code} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, duration: 0.4 }} className="flex items-center gap-3" data-testid="warehouse-utilization-row">
                  <span className="w-16 shrink-0 font-mono text-[11px] text-muted-foreground">{w.code}</span>
                  <span className="hidden w-44 shrink-0 truncate text-xs sm:block">{w.name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: w.utilization_pct > 85
                          ? `linear-gradient(90deg, ${C.amber}, ${C.red})`
                          : `linear-gradient(90deg, ${C.cyan}, ${C.blue})`,
                        boxShadow: w.utilization_pct > 85
                          ? `0 0 10px ${C.amber}50`
                          : `0 0 10px ${C.cyan}50`
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${w.utilization_pct}%` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right font-mono text-[11px] tabular-nums">{w.utilization_pct}%</span>
                  <span className="hidden w-20 shrink-0 text-right text-[11px] text-muted-foreground md:block">{fmtCurrency(w.stock_value)}</span>
                </motion.div>
              ))}
              {!warehouses && <RowsSkeleton rows={7} />}
            </div>
          </GlassPanel>

          <GlassPanel solid className="p-4 md:p-5" data-testid="insights-panel">
            <PanelHeader title="AI Recommended Actions" subtitle="Deterministic analysis of the live network — refreshed continuously" action={<Lightbulb size={15} className="text-[hsl(var(--warning))]" />} />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(insights || []).map((ins, i) => (
                <motion.div
                  key={ins.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  className="rounded-lg border border-[hsl(var(--stroke-soft)/0.5)] bg-[hsl(var(--surface-2)/0.4)] p-3"
                  data-testid="insight-card"
                >
                  <div className="flex items-center justify-between gap-2">
                    <SeverityBadge severity={ins.severity} />
                    {ins.impact && <span className="font-mono text-[10px] text-muted-foreground">{ins.impact}</span>}
                  </div>
                  <h4 className="mt-2 text-xs font-semibold leading-snug">{ins.title}</h4>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{ins.description}</p>
                  <p className="mt-2 flex items-start gap-1 text-[11px] text-[hsl(var(--primary))]">
                    <ArrowRight size={11} className="mt-0.5 shrink-0" /> {ins.action}
                  </p>
                </motion.div>
              ))}
              {!insights && <RowsSkeleton rows={4} />}
            </div>
          </GlassPanel>
        </div>

        {/* Right column: live events */}
        <GlassPanel solid className="flex max-h-[900px] flex-col p-4 md:p-5" data-testid="event-stream-panel">
          <PanelHeader
            title="Live Event Stream"
            subtitle="Business events unfolding in the digital twin"
            action={
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[hsl(var(--success))]">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" /> Live
              </span>
            }
          />
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            <EventStream events={events || []} simNow={kpis?.sim_time} limit={35} />
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
