import { NextRequestWithAuth, withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { Network, paymentMiddleware } from 'x402-next';

export default async function middleware(request: NextRequestWithAuth) {
  // Check if the route requires payment
  console.log("request.nextUrl.pathname", request.nextUrl.pathname);
  const isProtectedPaymentRoute = request.nextUrl.pathname.startsWith('/api/listings');

  // Check if the route requires authentication
  const isAuthRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/profile') 
    // ||
    // request.nextUrl.pathname.startsWith('/api/(protected)');

  try {
    // Handle authentication first
    if (isAuthRoute) {
      const authResponse = withAuth({
        pages: {
          signIn: "/auth/signin",
        },
      });;

      if (!authResponse) {
        return authResponse;
      }
    }

    // Handle payment protection
    if (isProtectedPaymentRoute) {
      console.log('Payment protection middleware triggered for:', request.nextUrl.pathname);
      return await paymentMiddleware(
        "0x705b8f77d90Ebab24C1934B49724686b8ee27f5F",
        {
          '/api/listings/*/purchase': {
            price: '$0.01',
            network: "base-sepolia" as Network,
            config: {
              description: 'Access to protected content'
            }
          }
        },
        {
          url: "https://x402.org/facilitator",
        }
      )(request);
    }

    // If no protection needed or all checks passed
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all routes that need protection:
     * - Dashboard routes
     * - Profile routes
     * - Protected API routes
     * - Payment protected routes
     */
    '/dashboard/:path*',
    '/profile/:path*',
    '/api/listings/:path*',
    '/protected/:path*'
  ]
};