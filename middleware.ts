export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/projects/:path*", "/settings/:path*", "/icon-maker/:path*", "/mockup-maker/:path*"],
};
