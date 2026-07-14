export const fmtCurrency = (v, compact = true) => {
  if (v === null || v === undefined || isNaN(v)) return "—";
  if (compact && Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (compact && Math.abs(v) >= 10_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export const fmtNumber = (v, compact = true) => {
  if (v === null || v === undefined || isNaN(v)) return "—";
  if (compact && Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (compact && Math.abs(v) >= 10_000) return `${(v / 1_000).toFixed(1)}K`;
  return Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 });
};

export const fmtPct = (v, digits = 1) =>
  v === null || v === undefined || isNaN(v) ? "—" : `${Number(v).toFixed(digits)}%`;

export const fmtSimDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export const fmtSimClock = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })
  );
};

export const fmtHours = (h) => {
  if (h === null || h === undefined || isNaN(h)) return "—";
  if (h < 24) return `${Math.round(h)}h`;
  return `${(h / 24).toFixed(1)}d`;
};

export const shortDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const relativeTime = (iso, simNow) => {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const now = simNow ? new Date(simNow).getTime() : Date.now();
  const diff = Math.max(0, now - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};
