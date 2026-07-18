"use client";

import { usePathname } from "next/navigation";

// Add more prefixes here if other routes should also go header-less.
const HIDE_HEADER_ON = ["/workspace", "/projects"];

// Deliberately takes `children` instead of importing Header directly.
// Header is rendered in the Server Component tree (layout.tsx) and passed
// in as an already-rendered element — this component only ever decides
// whether to show it, never how to render it. That's what keeps Header's
// server-only imports (Clerk's auth()) working: Header never becomes part
// of the client bundle just because this wrapper is a Client Component.
export default function HeaderVisibility({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideHeader = HIDE_HEADER_ON.some((prefix) =>
    pathname?.startsWith(prefix),
  );

  if (hideHeader) return null;

  return <>{children}</>;
}
