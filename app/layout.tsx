import type { Metadata } from "next";
import { DM_Sans, Lora } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Header from "@/components/Header";
import HeaderVisibility from "@/components/HeaderVisibility";
import { dark } from "@clerk/themes";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import GlowCursorFollow from "@/components/GlowCursorFollow";
import { CreditsProvider } from "@/contexts/CreditsContext";
import { checkUser } from "@/lib/checkUser";

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Forge - AI App Builder",
  description: "",
  icons: {
    icon: "/favicon.jpeg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Single source of truth for the initial credits value. Every credits
  // display in the app (CreditsBadge instances, WorkspaceClient) reads
  // from CreditsProvider instead of doing its own fetch — see
  // contexts/CreditsContext.tsx for how updates propagate.
  const user = await checkUser();

  return (
    <ClerkProvider
      appearance={{
        theme: dark,
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          suppressHydrationWarning
          className={`${lora.variable} ${dmSans.variable} font-sans`}
        >
          <GlowCursorFollow
            color="#00ffff"
            size={16}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
          />
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <CreditsProvider initialCredits={user?.credits ?? 0}>
              <HeaderVisibility>
                <Header />
              </HeaderVisibility>

              <main>{children}</main>

              <Toaster richColors />
            </CreditsProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
