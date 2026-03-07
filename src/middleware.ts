export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tickets/:path*",
    "/analytics/:path*",
    "/team/:path*",
    "/profile/:path*",
    "/notifications/:path*",
  ],
};
