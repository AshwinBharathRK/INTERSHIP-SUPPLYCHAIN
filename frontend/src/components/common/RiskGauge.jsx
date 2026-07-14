import React from "react";
import { motion } from "framer-motion";

export const RiskGauge = ({ score = 0, size = 84, level = "low", testId }) => {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const arc = 0.75 * circ;
  const filled = (Math.min(score, 100) / 100) * arc;
  const color =
    level === "high" ? "hsl(var(--critical))" : level === "medium" ? "hsl(var(--warning))" : "hsl(var(--success))";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} data-testid={testId || "supplier-risk-gauge"}>
      <svg width={size} height={size} className="-rotate-[215deg]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--surface-2))" strokeWidth={7} strokeDasharray={`${arc} ${circ}`} strokeLinecap="round" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${filled} ${circ}` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-semibold tabular-nums" style={{ color }}>
          {Math.round(score)}
        </span>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">risk</span>
      </div>
    </div>
  );
};
