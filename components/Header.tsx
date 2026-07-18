import Link from "next/link";
import { UserButton, SignInButton, Show } from "@clerk/nextjs";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreditsBadge } from "@/components/CreditsBadge";

// No longer calls checkUser() itself — credits now come from the shared
// CreditsProvider (see app/layout.tsx), and Show/UserButton/SignInButton
// are already fully reactive Clerk client components on their own. This
// also means one fewer server-side auth() call per render.
export default function Header() {
  return (
    <header className="fixed top-5 left-1/2 -translate-x-1/2 z-50 h-16 w-[calc(100%-2rem)] max-w-7xl rounded-4xl border border-white/8 bg-white/10">
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 select-none">
          <Image
            src="/logo.png"
            alt="Forge"
            width={100}
            height={100}
            className="h-9 w-auto rounded-md"
          />
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-5">
          <Show when="signed-in">
            <Link
              href="/projects"
              className="text-[13px] font-medium text-white/40 transition-colors hover:text-white/80"
            >
              Projects
            </Link>

            <CreditsBadge />

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
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-black hover:bg-white/90 active:scale-95"
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