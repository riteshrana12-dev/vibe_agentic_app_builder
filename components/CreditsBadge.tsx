"use client";

import { Zap } from "lucide-react";
import { PricingModal } from "@/components/PricingModal";
import { useCredits } from "@/contexts/CreditsContext";
import { cn } from "@/lib/utils";

// Used in both the marketing Header and WorkspaceHeader. Since both read
// from the same CreditsProvider higher up the tree, a credits change in
// either place (or from WorkspaceClient after a generation) shows up in
// all of them at once — nothing to keep in sync manually.
export function CreditsBadge({ compact = false }: { compact?: boolean }) {
  const { credits } = useCredits();

  return (
    <PricingModal>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 text-white/70",
          compact ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-xs",
        )}
      >
        <Zap className="h-3 w-3 fill-white/70" />
        {credits}
        {!compact && " credits"}
      </span>
    </PricingModal>
  );
}
