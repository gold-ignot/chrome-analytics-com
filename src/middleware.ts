import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // only track html page requests, not assets
  const contentType = request.headers.get('accept') || '';
  if (contentType.includes('text/html')) {
    // track server-side to goatcounter
    const url = request.nextUrl.pathname + request.nextUrl.search;
    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.ip || '';
    const referer = request.headers.get('referer') || '';
    const language = request.headers.get('accept-language') || '';

    // non-blocking server-side tracking
    fetch(`https://chromeanalytics.goatcounter.com/count?p=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'X-Forwarded-For': ip,
        'Referer': referer,
        'Accept-Language': language,
      },
    }).catch(() => {
      // silently fail if goatcounter is down
    });
  }

  // pass pathname for any components that need it
  response.headers.set('x-pathname', request.nextUrl.pathname + request.nextUrl.search);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};