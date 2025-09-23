import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // pass pathname to server components via header
  const response = NextResponse.next();
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