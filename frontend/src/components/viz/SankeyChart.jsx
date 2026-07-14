import React, { useMemo, useState } from "react";
import { sankey, sankeyLinkHorizontal, sankeyJustify } from "d3-sankey";
import { fmtCurrency } from "@/lib/format";

const NODE_COLORS = {
  SUP: "hsl(204, 88%, 56%)",
  DC: "hsl(190, 92%, 52%)",
  MKT: "hsl(156, 72%, 44%)",
};

const colorFor = (name) => NODE_COLORS[name.split("-")[0]] || "hsl(215, 14%, 70%)";

export const SankeyChart = ({ data, height = 520 }) => {
  const [hovered, setHovered] = useState(null);
  const width = 1100;

  const layout = useMemo(() => {
    if (!data?.nodes?.length) return null;
    const nameToIdx = Object.fromEntries(data.nodes.map((n, i) => [n.name, i]));
    const links = data.links
      .filter((l) => l.value > 0 && nameToIdx[l.source] !== undefined && nameToIdx[l.target] !== undefined)
      .map((l) => ({ source: nameToIdx[l.source], target: nameToIdx[l.target], value: l.value, kind: l.kind }));
    try {
      return sankey()
        .nodeWidth(14)
        .nodePadding(10)
        .nodeAlign(sankeyJustify)
        .extent([[0, 10], [width, height - 10]])({
        nodes: data.nodes.map((n) => ({ ...n })),
        links,
      });
    } catch (e) {
      return null;
    }
  }, [data, height]);

  if (!layout) return <div className="py-16 text-center text-xs text-muted-foreground">Not enough flow data yet.</div>;

  return (
    <div className="overflow-x-auto" data-testid="sankey-chart">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[820px]" style={{ width: "100%", height: "auto" }}>
        <defs>
          {layout.links.map((l, i) => (
            <linearGradient key={i} id={`lg-${i}`} x1={l.source.x1} x2={l.target.x0} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={colorFor(l.source.name)} stopOpacity={0.5} />
              <stop offset="100%" stopColor={colorFor(l.target.name)} stopOpacity={0.5} />
            </linearGradient>
          ))}
        </defs>
        {layout.links.map((l, i) => (
          <path
            key={i}
            d={sankeyLinkHorizontal()(l)}
            fill="none"
            stroke={`url(#lg-${i})`}
            strokeWidth={Math.max(1, l.width)}
            strokeOpacity={hovered === null || hovered === l.source.name || hovered === l.target.name ? 0.75 : 0.12}
            style={{ transition: "stroke-opacity 200ms ease" }}
          >
            <title>{`${l.source.name} → ${l.target.name}: ${fmtCurrency(l.value, false)}`}</title>
          </path>
        ))}
        {layout.nodes.map((n, i) => (
          <g key={i} onMouseEnter={() => setHovered(n.name)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }}>
            <rect x={n.x0} y={n.y0} width={n.x1 - n.x0} height={Math.max(2, n.y1 - n.y0)} rx={3} fill={colorFor(n.name)} fillOpacity={hovered === n.name ? 1 : 0.85}>
              <title>{`${n.name}: ${fmtCurrency(n.value, false)}`}</title>
            </rect>
            <text
              x={n.x0 < width / 2 ? n.x1 + 6 : n.x0 - 6}
              y={(n.y0 + n.y1) / 2}
              dy="0.35em"
              textAnchor={n.x0 < width / 2 ? "start" : "end"}
              fontSize={10.5}
              fontFamily="IBM Plex Mono, monospace"
              fill="hsl(215, 14%, 75%)"
            >
              {n.name}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex gap-5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: NODE_COLORS.SUP }} /> Suppliers (inbound shipment value)</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: NODE_COLORS.DC }} /> Distribution centers</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: NODE_COLORS.MKT }} /> Markets (allocated revenue)</span>
      </div>
    </div>
  );
};
