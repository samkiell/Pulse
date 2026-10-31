import { NextResponse, type NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/images") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  // 2. Health, Auth, and v1 Ingest/Telegram API proxy routes are strictly public (authenticated via API keys / webhook tokens)
  if (
    pathname === "/api/health" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/v1")
  ) {
    return NextResponse.next();
  }

  // Check for NextAuth session cookies
  const sessionToken =
    req.cookies.get("__Secure-authjs.session-token")?.value ||
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value ||
    req.cookies.get("next-auth.session-token")?.value;

  const isAuthenticated = Boolean(sessionToken);

  // 3. API route interception: return 401 JSON if unauthenticated
  if (pathname.startsWith("/api/")) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 4. Dashboard route interception: redirect to /login if unauthenticated
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 5. All other routes (e.g. /, /login, /docs) are public
  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
