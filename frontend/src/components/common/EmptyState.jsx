import React from "react";
import { Inbox } from "lucide-react";

export const EmptyState = ({ icon: Icon = Inbox, title = "Nothing here yet", description, action }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center" data-testid="empty-state">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--surface-2))]">
      <Icon size={20} className="text-muted-foreground" />
    </div>
    <h4 className="font-display text-sm font-semibold">{title}</h4>
    {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
    {action}
  </div>
);
