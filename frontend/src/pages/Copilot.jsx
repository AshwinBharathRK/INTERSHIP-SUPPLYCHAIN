import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Database, AlertTriangle, Factory } from "lucide-react";
import { fetchers } from "@/lib/api";
import { fmtCurrency, fmtPct } from "@/lib/format";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassPanel, PanelHeader } from "@/components/common/GlassPanel";
import { ChatPanel } from "@/components/copilot/ChatPanel";
import { SeverityBadge } from "@/components/common/SeverityBadge";
import { StatusChip } from "@/components/common/SeverityBadge";

export default function Copilot() {
  const { data: kpis } = useQuery({ queryKey: ["kpis"], queryFn: fetchers.kpis, refetchInterval: 10000 });
  const { data: insights } = useQuery({ queryKey: ["insights"], queryFn: fetchers.insights, refetchInterval: 20000 });
  const { data: risk } = useQuery({ queryKey: ["risk"], queryFn: fetchers.risk, refetchInterval: 30000 });

  return (
    <div className="mx-auto max-w-[1400px]" data-testid="copilot-page">
      <PageHeader
        title="Atlas — AI Supply Chain Copilot"
        subtitle="Every answer is grounded in the live state of your digital twin: inventory, suppliers, shipments and forecasts."
      />
      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-3">
        <GlassPanel solid className="flex h-[68vh] min-h-[480px] flex-col p-4 xl:col-span-2">
          <ChatPanel sessionId="workspace" />
        </GlassPanel>

        <div className="space-y-4">
          <GlassPanel solid className="p-4" data-testid="copilot-context-panel">
            <PanelHeader title="Live grounding context" subtitle="Injected into every prompt" action={<Database size={14} className="text-[hsl(var(--primary))]" />} />
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Ctx label="Inventory value" value={fmtCurrency(kpis?.inventory_value)} />
              <Ctx label="Fill rate" value={fmtPct(kpis?.fill_rate)} />
              <Ctx label="In transit" value={kpis?.in_transit_count} />
              <Ctx label="On-time delivery" value={fmtPct(kpis?.on_time_delivery_rate)} />
              <Ctx label="SKUs at risk" value={kpis?.skus_at_risk} />
              <Ctx label="Open POs" value={kpis?.open_purchase_orders} />
            </div>
          </GlassPanel>

          <GlassPanel solid className="p-4">
            <PanelHeader title="Current signals" subtitle="What Atlas can see right now" action={<AlertTriangle size={14} className="text-[hsl(var(--warning))]" />} />
            <div className="mt-3 space-y-2">
              {(insights || []).slice(0, 4).map((ins) => (
                <div key={ins.id} className="rounded-lg border border-[hsl(var(--stroke-soft)/0.4)] bg-[hsl(var(--surface-2)/0.4)] p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <SeverityBadge severity={ins.severity} />
                    <span className="truncate font-mono text-[10px] text-muted-foreground">{ins.impact}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] font-medium leading-snug">{ins.title}</p>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel solid className="p-4">
            <PanelHeader title="Highest-risk suppliers" action={<Factory size={14} className="text-muted-foreground" />} />
            <div className="mt-3 space-y-2">
              {(risk || []).slice(0, 4).map((s) => (
                <div key={s.code} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate">{s.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono tabular-nums text-muted-foreground">{s.risk.score}</span>
                    <StatusChip status={`${s.risk.level}_risk`} />
                  </span>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}

const Ctx = ({ label, value }) => (
  <div className="rounded-lg border border-[hsl(var(--stroke-soft)/0.4)] bg-[hsl(var(--surface-2)/0.35)] px-2.5 py-2">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="mt-0.5 font-mono text-xs font-medium tabular-nums">{value ?? "—"}</div>
  </div>
);
