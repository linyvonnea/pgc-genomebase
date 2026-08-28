import { NextRequest, NextResponse } from "next/server";

const VERCEL_HOSTNAME = "pgc-genomebase.vercel.app";
const OFFICIAL_HOSTNAME = "omics.pgcvisayas.upv.edu.ph";

export function middleware(request: NextRequest) {
  if (request.nextUrl.hostname !== VERCEL_HOSTNAME) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.protocol = "https:";
  redirectUrl.hostname = OFFICIAL_HOSTNAME;

  return NextResponse.redirect(redirectUrl, 308);
}

export const config = {
  matcher: "/:path*",
};
