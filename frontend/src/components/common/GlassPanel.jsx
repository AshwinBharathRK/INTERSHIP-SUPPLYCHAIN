import React from "react";

export const GlassPanel = ({ children, className = "", rim = false, solid = false, ...props }) => (
  <div
    className={`relative ${solid ? "glass-panel-solid" : "glass-panel"} ${rim ? "rim-light" : ""} ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const PanelHeader = ({ title, subtitle, action, className = "" }) => (
  <div className={`flex items-start justify-between gap-3 ${className}`}>
    <div>
      <h3 className="font-display text-sm font-semibold tracking-tight md:text-base">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
    {action}
  </div>
);
