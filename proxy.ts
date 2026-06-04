import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { rateLimit } from '@/lib/rate-limit';

const JWT_SECRET = process.env.JWT_SECRET;
const secretKey = JWT_SECRET ? new TextEncoder().encode(JWT_SECRET) : null;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // 1. CSRF Cookie Setup & State-Changing Request Check
  let csrfCookie = request.cookies.get('drevlo_csrf')?.value;
  let isNewCsrf = false;
  if (!csrfCookie) {
    csrfCookie = crypto.randomUUID();
    isNewCsrf = true;
  }

  // Define route classification
  const isLandingPage = pathname === '/';
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isApiRoute = pathname.startsWith('/api');
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico';

  const isProtectedRoute = !isLandingPage && !isAuthPage && !isApiRoute && !isStaticAsset;
  const isWebhookOrCron = pathname.startsWith('/api/webhooks') || pathname.startsWith('/api/cron');

  // Verify CSRF for state-changing requests (POST, PATCH, DELETE, PUT) on API/Pages (excluding Webhooks/Crons)
  const method = request.method.toUpperCase();
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (isStateChanging && !isWebhookOrCron) {
    const csrfHeader = request.headers.get('x-csrf-token');
    if (!csrfHeader || csrfHeader !== csrfCookie) {
      return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 });
    }
  }

  // 2. Global Rate Limiting on API routes (except webhooks/crons)
  if (isApiRoute && !isWebhookOrCron) {
    try {
      const limiter = await rateLimit(request, 'api-global', 60, 60); // 60 requests per minute
      if (!limiter.success) {
        const response = NextResponse.json(
          { error: 'Too many requests' },
          { status: 429 }
        );
        response.headers.set('X-RateLimit-Limit', String(limiter.limit));
        response.headers.set('X-RateLimit-Remaining', String(limiter.remaining));
        response.headers.set('X-RateLimit-Reset', String(limiter.reset));
        
        // Append CSRF cookie if it was newly created
        if (isNewCsrf && csrfCookie) {
          response.cookies.set('drevlo_csrf', csrfCookie, {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          });
        }
        return response;
      }
    } catch (err) {
      console.error('Global API rate limiting failed:', err);
    }
  }

  // 3. User Authentication Validation & Rotation Checks
  const accessCookie = request.cookies.get('drevlo_access');
  const refreshCookie = request.cookies.get('drevlo_refresh');

  let isAuthenticated = false;
  let didRotate = false;
  let newAccessVal = '';
  let newRefreshVal = '';

  if (accessCookie && secretKey) {
    try {
      await jwtVerify(accessCookie.value, secretKey);
      isAuthenticated = true;
    } catch (e) {
      // Access token expired or invalid, fall through to refresh rotation check
    }
  }

  // If access token is invalid but refresh token is present, perform automatic rotation
  if (!isAuthenticated && refreshCookie) {
    try {
      // Execute a backchannel POST to our Node.js token refresh endpoint
      const refreshResponse = await fetch(`${appUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      });

      if (refreshResponse.ok) {
        isAuthenticated = true;
        didRotate = true;

        // Extract new cookies set by the refresh route
        const setCookieHeaders = refreshResponse.headers.getSetCookie();
        for (const cookieStr of setCookieHeaders) {
          const parts = cookieStr.split(';')[0].split('=');
          const name = parts[0].trim();
          const value = parts[1]?.trim() || '';
          if (name === 'drevlo_access') newAccessVal = value;
          if (name === 'drevlo_refresh') newRefreshVal = value;
        }

        // Apply new values to current request cookies so downstream route handlers read them
        if (newAccessVal) request.cookies.set('drevlo_access', newAccessVal);
        if (newRefreshVal) request.cookies.set('drevlo_refresh', newRefreshVal);
      }
    } catch (err) {
      console.error('Failed to perform automated refresh token rotation:', err);
    }
  }

  // 4. Construct response and apply cookies
  let response: NextResponse;

  // Prepare downstream headers forwarding updated cookies
  if (didRotate) {
    // Re-serialize the Cookie header with the fresh values
    const cookiesList = request.cookies.getAll();
    const cookieHeaderStr = cookiesList.map((c) => `${c.name}=${c.value}`).join('; ');
    request.headers.set('cookie', cookieHeaderStr);

    // If redirected or continuing, pass modified headers
    if (isLandingPage && isAuthenticated) {
      response = NextResponse.redirect(new URL('/dashboard', request.url));
    } else if (isAuthPage && isAuthenticated) {
      response = NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      });
    }

    // Set rotated cookies on the client browser response
    if (newAccessVal) {
      response.cookies.set('drevlo_access', newAccessVal, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60,
      });
    }
    if (newRefreshVal) {
      response.cookies.set('drevlo_refresh', newRefreshVal, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
    }
  } else {
    // No rotation happened, default routing redirects
    if (isLandingPage && isAuthenticated) {
      response = NextResponse.redirect(new URL('/dashboard', request.url));
    } else if (isProtectedRoute && !isAuthenticated) {
      response = NextResponse.redirect(new URL('/login', request.url));
    } else if (isAuthPage && isAuthenticated) {
      response = NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      response = NextResponse.next();
    }
  }

  // Inject the CSRF token cookie if it is new
  if (isNewCsrf && csrfCookie) {
    response.cookies.set('drevlo_csrf', csrfCookie, {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
