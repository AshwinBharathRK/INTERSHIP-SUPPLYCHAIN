import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchers } from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassPanel, PanelHeader } from "@/components/common/GlassPanel";
import { PanelSkeleton } from "@/components/common/LoadingState";
import { SankeyChart } from "@/components/viz/SankeyChart";
import { TreemapChart } from "@/components/viz/TreemapChart";
import { HeatmapChart } from "@/components/viz/HeatmapChart";
import { NetworkGraph } from "@/components/viz/NetworkGraph";

export default function Analytics() {
  const { data: sankey } = useQuery({ queryKey: ["sankey"], queryFn: fetchers.sankey, refetchInterval: 60000 });
  const { data: abc } = useQuery({ queryKey: ["abc"], queryFn: fetchers.abc, refetchInterval: 60000 });
  const { data: heatmap } = useQuery({ queryKey: ["heatmap"], queryFn: () => fetchers.heatmap("category"), staleTime: 120000 });
  const { data: network } = useQuery({ queryKey: ["networkGraph"], queryFn: fetchers.network, refetchInterval: 60000 });

  return (
    <div className="mx-auto max-w-[1500px]" data-testid="analytics-page">
      <PageHeader
        title="Analytics Studio"
        subtitle="Enterprise visualizations computed from the full transactional history of the digital twin."
      />

      <Tabs defaultValue="flows" data-testid="analytics-tabs">
        <TabsList className="bg-[hsl(var(--surface-2))]">
          <TabsTrigger value="flows" className="text-xs" data-testid="analytics-tab-flows">Value Flows</TabsTrigger>
          <TabsTrigger value="abc" className="text-xs" data-testid="analytics-tab-abc">ABC / Pareto</TabsTrigger>
          <TabsTrigger value="seasonality" className="text-xs" data-testid="analytics-tab-seasonality">Seasonality</TabsTrigger>
          <TabsTrigger value="network" className="text-xs" data-testid="analytics-tab-network">Network Graph</TabsTrigger>
        </TabsList>

        <TabsContent value="flows" className="mt-4">
          <GlassPanel solid className="p-4 md:p-5">
            <PanelHeader title="Supplier → Warehouse → Market value flow" subtitle="Shipment value inbound and allocated market revenue outbound (last 60 sim-days)" />
            <div className="mt-4">{sankey ? <SankeyChart data={sankey} /> : <PanelSkeleton className="h-[520px]" />}</div>
          </GlassPanel>
        </TabsContent>

        <TabsContent value="abc" className="mt-4">
          <GlassPanel solid className="p-4 md:p-5">
            <PanelHeader title="ABC classification treemap" subtitle="Pareto analysis of annual revenue — A-class items drive 80% of revenue" />
            <div className="mt-4">{abc ? <TreemapChart data={abc} /> : <PanelSkeleton className="h-[520px]" />}</div>
          </GlassPanel>
        </TabsContent>

        <TabsContent value="seasonality" className="mt-4">
          <GlassPanel solid className="p-4 md:p-5">
            <PanelHeader title="Demand seasonality heatmap" subtitle="Average daily demand by category and month — note the Q4 peak and January dip" />
            <div className="mt-4">{heatmap ? <HeatmapChart data={heatmap} /> : <PanelSkeleton className="h-[420px]" />}</div>
          </GlassPanel>
        </TabsContent>

        <TabsContent value="network" className="mt-4">
          <GlassPanel solid className="p-4 md:p-5">
            <PanelHeader title="Supply network dependency graph" subtitle="Force-directed topology: suppliers (risk-colored) → warehouses → markets. Drag nodes to explore." />
            <div className="mt-4">{network ? <NetworkGraph data={network} /> : <PanelSkeleton className="h-[560px]" />}</div>
          </GlassPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
