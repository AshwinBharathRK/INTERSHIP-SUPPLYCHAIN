import React, { useMemo, useState } from "react";
import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import { fmtCurrency } from "@/lib/format";

const CLASS_COLORS = {
  A: { fill: "hsla(190, 92%, 52%, 0.55)", stroke: "hsl(190, 92%, 52%)" },
  B: { fill: "hsla(204, 88%, 56%, 0.4)", stroke: "hsl(204, 88%, 56%)" },
  C: { fill: "hsla(215, 14%, 45%, 0.3)", stroke: "hsl(215, 14%, 55%)" },
};

export const TreemapChart = ({ data, height = 520 }) => {
  const [hovered, setHovered] = useState(null);
  const width = 1100;

  const leaves = useMemo(() => {
    if (!data?.length) return [];
    const root = hierarchy({
      name: "root",
      children: ["A", "B", "C"].map((cls) => ({
        name: `Class ${cls}`,
        children: data.filter((d) => d.abc_class === cls).map((d) => ({ ...d, name: d.sku })),
      })),
    })
      .sum((d) => d.annual_revenue || 0)
      .sort((a, b) => b.value - a.value);
    treemap().size([width, height]).paddingInner(3).paddingOuter(6).paddingTop(22).tile(treemapSquarify)(root);
    return root;
  }, [data, height]);

  if (!leaves?.leaves) return null;

  return (
    <div data-testid="treemap-chart">
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
        {leaves.children?.map((group) => (
          <g key={group.data.name}>
            <text x={group.x0 + 6} y={group.y0 + 15} fontSize={11} fontWeight={600} fill="hsl(215, 14%, 75%)" fontFamily="Space Grotesk, sans-serif">
              {group.data.name} · {fmtCurrency(group.value)}
            </text>
          </g>
        ))}
        {leaves.leaves().map((leaf, i) => {
          const cls = leaf.data.abc_class || "C";
          const c = CLASS_COLORS[cls];
          const w = leaf.x1 - leaf.x0;
          const h = leaf.y1 - leaf.y0;
          const isHover = hovered === leaf.data.sku;
          return (
            <g key={i} onMouseEnter={() => setHovered(leaf.data.sku)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }}>
              <rect
                x={leaf.x0}
                y={leaf.y0}
                width={w}
                height={h}
                rx={5}
                fill={c.fill}
                stroke={c.stroke}
                strokeOpacity={isHover ? 1 : 0.35}
                strokeWidth={isHover ? 1.5 : 1}
                style={{ transition: "stroke-opacity 150ms ease" }}
              >
                <title>{`${leaf.data.sku} — ${leaf.data.name_full || leaf.data.name}\n${leaf.data.category}\nAnnual revenue: ${fmtCurrency(leaf.data.annual_revenue, false)}\nShare: ${leaf.data.revenue_share_pct}%`}</title>
              </rect>
              {w > 70 && h > 34 && (
                <>
                  <text x={leaf.x0 + 7} y={leaf.y0 + 16} fontSize={10} fontFamily="IBM Plex Mono, monospace" fill="hsl(210, 20%, 92%)">{leaf.data.sku}</text>
                  <text x={leaf.x0 + 7} y={leaf.y0 + 29} fontSize={9} fill="hsl(215, 14%, 70%)">{fmtCurrency(leaf.data.annual_revenue)}</text>
                </>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex gap-5 text-[11px] text-muted-foreground">
        {Object.entries(CLASS_COLORS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: v.stroke }} /> Class {k}{k === "A" ? " — top 80% of revenue" : k === "B" ? " — next 15%" : " — tail 5%"}</span>
        ))}
      </div>
    </div>
  );
};
