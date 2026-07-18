"use client";

import Link from "next/link";
import { UserButton, SignInButton, Show } from "@clerk/nextjs";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreditsBadge } from "@/components/CreditsBadge";

// Simplified on purpose: just the logo (→ home), Workspace + Projects
// links, credits, and auth — no separate "Home" text link since the logo
// already covers that. No longer calls checkUser() itself either — same
// reasoning as Header.tsx, credits come from CreditsProvider now.
export default function WorkspaceHeader() {
  return (
    <header className="sticky top-0 z-50 h-14 w-full shrink-0 border-b border-white/6 bg-[#0a0a0a]">
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 select-none">
          <Image
            src="/logo.png"
            alt="Forge"
            width={28}
            height={28}
            className="h-7 w-auto rounded-md"
          />
        </Link>

        <div className="flex items-center gap-5">
          <Link
            href="/workspace"
            className="text-[13px] font-medium text-white/40 transition-colors hover:text-white/80"
          >
            Workspace
          </Link>
          <Link
            href="/projects"
            className="text-[13px] font-medium text-white/40 transition-colors hover:text-white/80"
          >
            Projects
          </Link>

          <Show when="signed-in">
            <CreditsBadge compact />
            <UserButton />
          </Show>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button
                variant="ghost"
                size="sm"
                className="text-[13px] font-medium text-white/50 hover:text-white/90 hover:bg-transparent"
              >
                Sign in
              </Button>
            </SignInButton>
            <SignInButton mode="modal">
              <Button
                size="sm"
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white px-4 text-[13px] font-semibold text-black hover:bg-white/90 active:scale-95"
              >
                Get Started
                <ArrowRight className="h-3 w-3 opacity-60" />
              </Button>
            </SignInButton>
          </Show>
        </div>
      </nav>
    </header>
  );
}
