import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET; // Same secret as in your next-auth config

  // Decode the JWT from the request
  const token = await getToken({ req, secret });

  if (token) {
    // Check if the user has a username
    if (!token.username) {
      const url = req.nextUrl.clone();
      url.pathname = "/set-username";
      return NextResponse.redirect(url);
    }
  }

  // Allow the request to continue
  return NextResponse.next();
}

// Specify routes to protect
export const config = {
  matcher: "/((?!api|_next|set-username|public).*)", // Protect all routes except API, static files, and set-username
};
