import React from "react";
import { Ship, Plane, Truck } from "lucide-react";

const SEVERITY_CLASSES = {
  info: "bg-[hsl(var(--info)/0.14)] text-[hsl(var(--info))] border-[hsl(var(--info)/0.25)]",
  success: "bg-[hsl(var(--success)/0.14)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.25)]",
  warning: "bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.25)]",
  critical: "bg-[hsl(var(--critical)/0.14)] text-[hsl(var(--critical))] border-[hsl(var(--critical)/0.25)]",
};

export const SeverityBadge = ({ severity = "info", children, className = "" }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${SEVERITY_CLASSES[severity] || SEVERITY_CLASSES.info} ${className}`}
  >
    {children || severity}
  </span>
);

const STATUS_MAP = {
  healthy: { cls: SEVERITY_CLASSES.success, label: "Healthy" },
  low: { cls: SEVERITY_CLASSES.warning, label: "Low stock" },
  critical: { cls: SEVERITY_CLASSES.critical, label: "Critical" },
  in_transit: { cls: SEVERITY_CLASSES.info, label: "In transit" },
  delivered: { cls: SEVERITY_CLASSES.success, label: "Delivered" },
  A: { cls: SEVERITY_CLASSES.success, label: "A" },
  B: { cls: SEVERITY_CLASSES.info, label: "B" },
  C: { cls: "bg-[hsl(var(--muted))] text-muted-foreground border-[hsl(var(--stroke-soft))]", label: "C" },
  low_risk: { cls: SEVERITY_CLASSES.success, label: "Low" },
  medium_risk: { cls: SEVERITY_CLASSES.warning, label: "Medium" },
  high_risk: { cls: SEVERITY_CLASSES.critical, label: "High" },
};

export const StatusChip = ({ status, label, className = "" }) => {
  const m = STATUS_MAP[status] || STATUS_MAP.in_transit;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${m.cls} ${className}`}>
      {label || m.label}
    </span>
  );
};

export const ModeIcon = ({ mode, size = 14, className = "" }) => {
  const Icon = mode === "air" ? Plane : mode === "road" ? Truck : Ship;
  return <Icon size={size} className={className} />;
};
