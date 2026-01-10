import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  console.log("jherer",pathname)

  // 👉 Skip public routes
  if (
    pathname.includes("login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/public")
  ) {
    return NextResponse.next();
  }

  // 👉 Try reading JWT from Authorization header
  const authHeader = req.headers.get("authorization");
  let token = authHeader?.replace("Bearer ", "");

  // 👉 Or from cookie (recommended)
  if (!token) {
    console.log("sdsdsdsdssdsdsdsd")
    token = req.cookies.get("token")?.value;
  }

  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    return NextResponse.next(); // 👍 allow request

    jwt.verify(token as any, process.env.JWT_SECRET!);
    return NextResponse.next(); // 👍 allow request
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: [
    "/api/:path*",   // protect all API routes
    "/dashboard/:path*", // protect dashboard pages
  ]
};
