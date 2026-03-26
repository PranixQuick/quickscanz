import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // www → canonical redirect
  const host = request.headers.get("host") || "";
  if (host.startsWith("www.")) {
    const canonical = new URL(request.url);
    canonical.host = host.replace(/^www\./, "");
    return NextResponse.redirect(canonical, { status: 301 });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const protectedPaths = [
    "/dashboard", "/products", "/claim", "/family",
    "/smart-devices", "/energy", "/iot-hub", "/account",
    "/compare", "/buying-assistant", "/pricing", "/payment",
  ];

  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  const authPaths = ["/login", "/signup", "/forgot-password"];
  const isAuthPage = authPaths.some((path) =>
    request.nextUrl.pathname === path
  );

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|robots.txt|sitemap.xml|\\.well-known).*)",
  ],
};
