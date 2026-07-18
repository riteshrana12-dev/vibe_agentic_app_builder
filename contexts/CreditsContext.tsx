"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { PLANS } from "@/lib/constants"; // your plan definitions

type CreditsContextValue = {
  credits: number;
  setCredits: (n: number) => void;
  refreshCredits: () => void;
};

const CreditsContext = createContext<CreditsContextValue | null>(null);

export function CreditsProvider({
  initialCredits,
  children,
}: {
  initialCredits: number;
  children: React.ReactNode;
}) {
  const [credits, setCredits] = useState(initialCredits);
  const { user } = useUser();

  // ✅ Fix #1: Sync with server-side initialCredits safely
  useEffect(() => {
    if (credits !== initialCredits) {
      // defer update to avoid synchronous setState warning
      Promise.resolve().then(() => setCredits(initialCredits));
    }
  }, [initialCredits, credits]);

  // Manual refresh helper
  const refreshCredits = () => {
    if (!user) return;
    const plan = (user.publicMetadata.plan as keyof typeof PLANS) ?? "free";
    const newCredits = PLANS[plan].credits;
    if (credits !== newCredits) {
      setCredits(newCredits);
    }
  };

  // ✅ Fix #2: Auto-refresh when Clerk plan changes safely
  useEffect(() => {
    if (!user) return;
    const plan = (user.publicMetadata.plan as keyof typeof PLANS) ?? "free";
    const newCredits = PLANS[plan].credits;

    if (credits !== newCredits) {
      // defer update to next tick
      Promise.resolve().then(() => setCredits(newCredits));
    }
  }, [user?.publicMetadata.plan, credits]);

  return (
    <CreditsContext.Provider value={{ credits, setCredits, refreshCredits }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const ctx = useContext(CreditsContext);
  if (!ctx) {
    throw new Error("useCredits must be used within a CreditsProvider");
  }
  return ctx;
}
