import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PackageCheck, PackageX, AlertTriangle, ShoppingCart, Truck, Info } from "lucide-react";
import { SeverityBadge } from "@/components/common/SeverityBadge";
import { relativeTime } from "@/lib/format";

const TYPE_ICON = {
  shipment_arrived: PackageCheck,
  shipment_departed: Truck,
  shipment_delayed: AlertTriangle,
  stockout: PackageX,
  low_stock: AlertTriangle,
  order_created: ShoppingCart,
};

export const EventStream = ({ events = [], simNow, limit = 30, className = "" }) => {
  return (
    <div className={`space-y-2 ${className}`} data-testid="event-stream">
      <AnimatePresence initial={false}>
        {events.slice(0, limit).map((e) => {
          const Icon = TYPE_ICON[e.type] || Info;
          return (
            <motion.div
              key={e.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={`flex gap-2.5 rounded-lg border px-3 py-2.5 ${
                e.severity === "critical"
                  ? "border-[hsl(var(--critical)/0.3)] bg-[hsl(var(--critical)/0.06)]"
                  : "border-[hsl(var(--stroke-soft)/0.5)] bg-[hsl(var(--surface-2)/0.4)]"
              }`}
              data-testid="event-item"
            >
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                style={{
                  background: `hsl(var(--${e.severity === "success" ? "success" : e.severity === "warning" ? "warning" : e.severity === "critical" ? "critical" : "info"}) / 0.12)`,
                  color: `hsl(var(--${e.severity === "success" ? "success" : e.severity === "warning" ? "warning" : e.severity === "critical" ? "critical" : "info"}))`,
                }}
              >
                <Icon size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium">{e.title}</span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{relativeTime(e.ts, simNow)}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{e.description}</p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {events.length === 0 && (
        <div className="py-8 text-center text-xs text-muted-foreground">Waiting for network events…</div>
      )}
    </div>
  );
};
