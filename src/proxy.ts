import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Define restricted paths that only admins can access
  const restrictedPaths = ['/categories', '/menu-items', '/settings'];
  
  // Check if the current path is in the restricted list
  const isRestrictedPath = restrictedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (isRestrictedPath) {
    const isAdmin = request.cookies.get('admin_auth')?.value === 'true';
    
    // If trying to access a restricted path without admin auth, redirect to dashboard
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except API, _next/static, _next/image, and favicon
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
