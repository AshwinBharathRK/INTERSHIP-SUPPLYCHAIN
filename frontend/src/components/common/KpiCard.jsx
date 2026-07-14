import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { C } from "@/lib/theme";

export const KpiCard = ({ label, value, format, delta, deltaLabel, icon: Icon, spark, tone = "default", testId, index = 0 }) => {
  const positive = delta !== undefined && delta >= 0;
  const toneColor =
    tone === "warning" ? "hsl(var(--warning))" : tone === "critical" ? "hsl(var(--critical))" : "hsl(var(--primary))";

  const hoverClass =
    tone === "warning"
      ? "hover-glow-warning"
      : tone === "critical"
      ? "hover-glow-critical"
      : tone === "success"
      ? "hover-glow-success"
      : "hover-glow-card";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className={`glass-panel rim-light group relative overflow-hidden p-4 md:p-5 hover-glow-card ${hoverClass}`}
      data-testid={testId || "kpi-card"}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: `${toneColor.replace(")", " / 0.12)")}`, color: toneColor }}>
            <Icon size={14} />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2.5">
        <span className="font-display text-2xl font-semibold tracking-tight md:text-[28px]">
          <AnimatedNumber value={value} format={format} />
        </span>
        {delta !== undefined && (
          <span
            className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
              positive
                ? "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]"
                : "bg-[hsl(var(--critical)/0.12)] text-[hsl(var(--critical))]"
            }`}
          >
            {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      {deltaLabel && <div className="mt-1 text-[11px] text-muted-foreground">{deltaLabel}</div>}
      {spark && spark.length > 2 && (
        <div className="absolute inset-x-0 bottom-0 h-10 opacity-50 transition-opacity duration-300 group-hover:opacity-85">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={toneColor} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={toneColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={toneColor} strokeWidth={1.8} fill={`url(#spark-${label})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
};
