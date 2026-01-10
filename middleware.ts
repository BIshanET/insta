import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode("secretttt");

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  

  // Public routes
  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/signup") ||
    pathname.startsWith("/api/public")
  ) {
    return NextResponse.next();
  }

  // Token from header or cookie
  let token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Decode JWT
    const { payload } = await jwtVerify(token, SECRET);

    // Create modified request with user data injected
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", payload.id as string);
    if (payload.email) requestHeaders.set("x-user-email", payload.email as string);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (err) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*"],
};
