import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { ChatPanel } from "@/components/copilot/ChatPanel";

export const CopilotDrawer = () => {
  const { copilotOpen, setCopilotOpen } = useApp();

  return (
    <Sheet open={copilotOpen} onOpenChange={setCopilotOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-[hsl(var(--stroke-soft)/0.6)] bg-[hsl(var(--surface-1)/0.97)] p-4 backdrop-blur-md sm:max-w-[480px]"
        data-testid="copilot-drawer"
      >
        <SheetHeader className="shrink-0">
          <SheetTitle className="font-display flex items-center gap-2 text-base">
            <Sparkles size={16} className="text-[hsl(var(--primary))]" />
            Atlas Copilot
          </SheetTitle>
          <SheetDescription className="text-xs">
            Answers grounded in live platform data — updated every simulation tick.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1">
          <ChatPanel sessionId="global" compact />
        </div>
      </SheetContent>
    </Sheet>
  );
};
