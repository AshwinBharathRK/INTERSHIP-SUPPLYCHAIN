import React, { useEffect, useMemo, useRef, useState } from "react";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY } from "d3-force";

const TYPE_COLOR = {
  warehouse: "hsl(190, 92%, 52%)",
  market: "hsl(215, 14%, 60%)",
};

const riskColor = (risk) => (risk > 55 ? "hsl(0, 78%, 56%)" : risk > 30 ? "hsl(34, 92%, 56%)" : "hsl(156, 72%, 44%)");

export const NetworkGraph = ({ data, height = 560 }) => {
  const width = 1100;
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [hovered, setHovered] = useState(null);
  const simRef = useRef(null);
  const dragRef = useRef(null);
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data?.nodes) return;
    const ns = data.nodes.map((n) => ({ ...n }));
    const ls = data.links
      .filter((l) => ns.find((n) => n.id === l.source) && ns.find((n) => n.id === l.target))
      .map((l) => ({ ...l }));
    const sim = forceSimulation(ns)
      .force("link", forceLink(ls).id((d) => d.id).distance((l) => (l.kind === "distribution" ? 60 : 110)).strength(0.35))
      .force("charge", forceManyBody().strength(-220))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide(26))
      .force("x", forceX(width / 2).strength(0.04))
      .force("y", forceY(height / 2).strength(0.06));
    sim.on("tick", () => {
      setNodes([...ns]);
      setLinks([...ls]);
    });
    simRef.current = sim;
    return () => sim.stop();
  }, [data, height]);

  const svgPoint = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
    };
  };

  const onPointerDown = (node) => (e) => {
    e.target.setPointerCapture(e.pointerId);
    dragRef.current = node;
    simRef.current?.alphaTarget(0.25).restart();
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const p = svgPoint(e);
    dragRef.current.fx = p.x;
    dragRef.current.fy = p.y;
  };
  const onPointerUp = () => {
    if (dragRef.current) {
      dragRef.current.fx = null;
      dragRef.current.fy = null;
      dragRef.current = null;
      simRef.current?.alphaTarget(0);
    }
  };

  const connected = useMemo(() => {
    if (!hovered) return null;
    const set = new Set([hovered]);
    links.forEach((l) => {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      if (s === hovered) set.add(t);
      if (t === hovered) set.add(s);
    });
    return set;
  }, [hovered, links]);

  return (
    <div data-testid="analytics-graph">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", touchAction: "none" }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {links.map((l, i) => {
          const s = typeof l.source === "object" ? l.source : null;
          const t = typeof l.target === "object" ? l.target : null;
          if (!s || !t) return null;
          const active = connected && (connected.has(s.id) || connected.has(t.id)) && (s.id === hovered || t.id === hovered);
          return (
            <line
              key={i}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke={active ? "hsl(190, 92%, 52%)" : "hsl(215, 14%, 40%)"}
              strokeOpacity={connected ? (active ? 0.8 : 0.08) : l.kind === "distribution" ? 0.15 : 0.3}
              strokeWidth={active ? 1.6 : l.active > 0 ? 1.4 : 0.8}
            />
          );
        })}
        {nodes.map((n) => {
          const color = n.type === "supplier" ? riskColor(n.risk || 0) : TYPE_COLOR[n.type] || TYPE_COLOR.market;
          const r = n.type === "warehouse" ? 13 : n.type === "supplier" ? 10 : 6;
          const dim = connected && !connected.has(n.id);
          return (
            <g
              key={n.id}
              transform={`translate(${n.x || 0},${n.y || 0})`}
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              onPointerDown={onPointerDown(n)}
              style={{ cursor: "grab", opacity: dim ? 0.25 : 1, transition: "opacity 150ms ease" }}
            >
              <circle r={r} fill={color} fillOpacity={0.85} stroke="rgba(255,255,255,0.25)" strokeWidth={1} style={hovered === n.id ? { filter: `drop-shadow(0 0 8px ${color})` } : undefined}>
                <title>{`${n.name} (${n.type}${n.risk !== undefined ? `, risk ${n.risk}` : ""})`}</title>
              </circle>
              {(n.type !== "market" || hovered === n.id) && (
                <text y={-r - 5} textAnchor="middle" fontSize={8.5} fontFamily="IBM Plex Mono, monospace" fill="hsl(215, 14%, 72%)">
                  {n.id}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR.warehouse }} /> Warehouse</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(156,72%,44%)" }} /> Supplier (low risk)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(34,92%,56%)" }} /> Supplier (medium)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(0,78%,56%)" }} /> Supplier (high)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR.market }} /> Market</span>
      </div>
    </div>
  );
};
