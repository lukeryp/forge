import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { checkRateLimit } from '@/lib/api/middleware';

const AUTH_RATE_LIMIT_MAX    = 10;
const AUTH_RATE_LIMIT_WINDOW = 15 * 60 * 1000;

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate limit auth endpoints
  if (pathname.startsWith('/api/auth/')) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!checkRateLimit(`auth:${ip}`, AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW)) {
      return NextResponse.json({ error: 'Too many requests', code: 'RATE_LIMITED' }, { status: 429 });
    }
  }

  let supabaseResponse = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL'] as string,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] as string,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthPage   = pathname === '/login';
  const isApiRoute   = pathname.startsWith('/api/');
  const isPublic     = isAuthPage || isApiRoute;
  const isProtected  = !isPublic;

  if (!user && isProtected) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthPage) {
    const dashboardUrl = req.nextUrl.clone();
    dashboardUrl.pathname = '/';
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
