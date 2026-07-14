import React, { useMemo, useState } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const HeatmapChart = ({ data }) => {
  const [hovered, setHovered] = useState(null);

  const { rows, grid, max } = useMemo(() => {
    if (!data?.rows) return { rows: [], grid: {}, max: 1 };
    const g = {};
    let m = 0;
    data.data.forEach((c) => {
      g[`${c.row}-${c.month}`] = c.value;
      m = Math.max(m, c.value);
    });
    return { rows: data.rows, grid: g, max: m || 1 };
  }, [data]);

  return (
    <div className="overflow-x-auto" data-testid="heatmap-chart">
      <div className="min-w-[760px]">
        <div className="grid" style={{ gridTemplateColumns: `150px repeat(12, 1fr)` }}>
          <div />
          {MONTHS.map((m) => (
            <div key={m} className="pb-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground">{m}</div>
          ))}
          {rows.map((row) => (
            <React.Fragment key={row}>
              <div className="flex items-center pr-3 text-xs text-muted-foreground">{row}</div>
              {MONTHS.map((_, mi) => {
                const v = grid[`${row}-${mi + 1}`] || 0;
                const t = v / max;
                const key = `${row}-${mi + 1}`;
                return (
                  <div
                    key={key}
                    onMouseEnter={() => setHovered(key)}
                    onMouseLeave={() => setHovered(null)}
                    className="relative m-[2px] flex h-9 items-center justify-center rounded-md"
                    style={{
                      background: `hsla(190, 92%, 52%, ${0.06 + t * 0.75})`,
                      boxShadow: hovered === key ? "0 0 0 1.5px hsl(190, 92%, 52%)" : "none",
                      transition: "box-shadow 150ms ease",
                    }}
                    title={`${row} · ${MONTHS[mi]}: ${v} avg units/day`}
                    data-testid="heatmap-cell"
                  >
                    {hovered === key && <span className="font-mono text-[10px] font-medium text-white">{Math.round(v)}</span>}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>Low</span>
          <div className="h-2 w-40 rounded-full" style={{ background: "linear-gradient(90deg, hsla(190,92%,52%,0.08), hsla(190,92%,52%,0.85))" }} />
          <span>High · avg units/day</span>
        </div>
      </div>
    </div>
  );
};
