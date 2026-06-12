// src/middleware.ts
export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    // Protected pages
    "/dashboard/:path*",
    "/ingestion/:path*",
    "/simulator/:path*",
    "/goals/:path*",
    "/insights/:path*",
    // Protected API routes
    "/api/log/:path*",
    "/api/dashboard/:path*",
    "/api/simulate/:path*",
    "/api/ai/:path*",
    "/api/goals/:path*",
    "/api/upload/:path*",
    "/api/terminal/:path*",
    "/api/profile/:path*",
    "/api/mock",
  ],
};