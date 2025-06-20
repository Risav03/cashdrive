import { NextRequestWithAuth, withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { Network, paymentMiddleware } from "x402-next";
import { getListingDetails, getSharedLinkDetails } from "./app/utils/listingDetailFetcher";


export default async function middleware(request: NextRequestWithAuth) {
  console.log("Middleware called for:", request.nextUrl.pathname);
  
  const isProtectedPaymentRoute = request.nextUrl.pathname.startsWith(
    "/api/listings",
  );

  const isProtectedMonetizedLinkRoute = request.nextUrl.pathname.startsWith(
    "/api/shared-links",
  ) && !request.nextUrl.pathname.includes("/details");

  const isAuthRoute = request.nextUrl.pathname.startsWith("/dashboard");

  try {
    if (isAuthRoute) {
      console.log("Processing auth route:", request.nextUrl.pathname);
      const authResponse = withAuth({
        pages: {
          signIn: "/auth/signin",
        },
      });

      if (!authResponse) {
        return authResponse;
      }
    }

    if (isProtectedPaymentRoute) {
      console.log(
        "Payment protection middleware triggered for:",
        request.nextUrl.pathname,
      );

      // Extract listing ID from the URL path
      const pathParts = request.nextUrl.pathname.split('/');
      const listingId = pathParts[3]; // /api/listings/[id]/purchase
      
      console.log("pathParts", pathParts, listingId);
      if (listingId && pathParts[4] == "purchase") {
        console.log("Fetching listing details for:", listingId);
        
        // Fetch listing details via API endpoint
        const listing = await getListingDetails(listingId);
        
        if (!listing) {
          console.log("Listing not found:", listingId);
          return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        if (!listing.sellerWallet) {
          console.log("Seller wallet not found for listing:", listingId);
          return NextResponse.json({ error: 'Seller wallet not found' }, { status: 400 });
        }

        // Check if affiliate provided
        const searchParams = request.nextUrl.searchParams;
        const isAffiliateProvided = searchParams.get('affiliateProvided') === 'true';
        
        // Use affiliate wallet if affiliate provided, otherwise use seller wallet
        const targetWallet = isAffiliateProvided 
          ? "0x4FA2D62E28f46b3321366a6D5497acEd5a7E12FD" 
          : listing.sellerWallet;

        console.log("Configuring payment middleware with:", {
          wallet: targetWallet,
          price: listing.price,
          title: listing.title
        });

        return await paymentMiddleware(
          targetWallet,
          {
            "/api/listings/*/purchase": {
              price: `$${listing.price}`,
              network: "base-sepolia" as Network,
              config: {
                description: `Purchase: ${listing.title}`,
              },
            },
          },
          {
            url: "https://x402.org/facilitator",
          },
        )(request);
      } else {
        console.log("Not a purchase route, passing through:", request.nextUrl.pathname);
      }
    }

    if (isProtectedMonetizedLinkRoute) {
      console.log(
        "Shared link payment protection middleware triggered for:",
        request.nextUrl.pathname,
      );

      // Extract link ID from the URL path
      const pathParts = request.nextUrl.pathname.split('/');
      const linkId = pathParts[3]; // /api/shared-links/[linkId]/pay
      
      console.log("pathParts", pathParts, linkId);
      if (linkId && pathParts[4] == "purchase") {
        console.log("Fetching shared link details for:", linkId);
        
        // Fetch shared link details via API endpoint
        const sharedLink = await getSharedLinkDetails(linkId);
        
        if (!sharedLink) {
          console.log("Shared link not found:", linkId);
          return NextResponse.json({ error: 'Shared link not found' }, { status: 404 });
        }

        if (!sharedLink.sellerWallet) {
          console.log("Seller wallet not found for shared link:", linkId);
          return NextResponse.json({ error: 'Seller wallet not found' }, { status: 400 });
        }

        console.log("Configuring payment middleware for shared link with:", {
          wallet: sharedLink.sellerWallet,
          price: sharedLink.price,
          title: sharedLink.title
        });

        return await paymentMiddleware(
          sharedLink.sellerWallet,
          {
            "/api/shared-links/*/purchase": {
              price: `$${sharedLink.price}`,
              network: "base-sepolia" as Network,
              config: {
                description: `Purchase: ${sharedLink.title}`,
              },
            },
          },
          {
            url: "https://x402.org/facilitator",
          },
        )(request);
      } else {
        console.log("Not a shared link pay route, passing through:", request.nextUrl.pathname);
      }
    }

    console.log("Passing request through:", request.nextUrl.pathname);
    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all routes that need protection:
     * - Dashboard routes
     * - Profile routes
     * - Protected API routes (excluding details endpoint)
     * - Payment protected routes
     */
    "/dashboard/:path*",
    "/profile/:path*",
    "/api/listings/:path*",
    "/api/shared-links/:path*",
    "/protected/:path*",
  ],
};
