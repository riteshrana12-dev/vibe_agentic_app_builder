import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (auth, req) => {
  const { userId, redirectToSignIn } = await auth();

  // Protect /workspace and /projects routes
  if (
    !userId &&
    (req.nextUrl.pathname.startsWith("/workspace") ||
      req.nextUrl.pathname.startsWith("/projects"))
  ) {
    return redirectToSignIn();
  }

  return NextResponse.next();
});

// Apply middleware globally but exclude static assets
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
