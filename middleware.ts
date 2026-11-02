import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, X-Requested-With, X-CSRF-Token",
  "Access-Control-Max-Age": "86400",
};

export async function middleware(request: NextRequest) {
  // 1. Intercept API routes: handle CORS preflight and add CORS headers
  if (request.nextUrl.pathname.startsWith("/api")) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const response = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  const token = request.cookies.get("boat_session")?.value;

  // 2. Instant redirect for signed-in users from root "/" to "/dashboard"
  if (request.nextUrl.pathname === "/" && token) {
    try {
      const secretVal = process.env.JWT_SECRET || "";
      if (secretVal.length >= 16) {
        await jwtVerify(token, new TextEncoder().encode(secretVal));
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch {}
  }

  // 3. Auth protection for web dashboard pages
  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/api/:path*"],
};
