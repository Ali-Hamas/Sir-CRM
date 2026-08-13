import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token');
  const { pathname, searchParams } = request.nextUrl;

  if (searchParams.get('clear') === '1') {
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;
  }

  const publicRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email'];

  if (publicRoutes.includes(pathname)) {
    if (token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
