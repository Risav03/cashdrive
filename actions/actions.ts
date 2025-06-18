"use server";

import { authOptions } from '@/app/lib/backend/authConfig';
import { CdpClient } from "@coinbase/cdp-sdk";
import axios from "axios";
import { getServerSession } from 'next-auth/next';
import { withPaymentInterceptor } from "x402-axios";
import type { Wallet } from "x402/types";

export async function purchaseFromMarketplace(
  wallet: `0x${string}`, 
  id: string, 
  affiliateCode?: string
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      throw new Error("User not authenticated");
    }

    const cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      walletSecret: process.env.CDP_WALLET_SECRET,
    });

    const account = await cdp.evm.getAccount({ address: wallet });

    console.log("account", account);

    // Get listing details to get price and seller wallet
    const listingResponse = await axios.get(`${process.env.NEXT_PUBLIC_HOST_NAME}/api/listings/${id}/details`);
    const listing = listingResponse.data;
    const totalAmount = listing.price;

    let headers:any = {
        'Content-Type': 'application/json',
        'x-user-id': session.user.id,
        'x-user-email': session.user.email || '',
    }

    if (affiliateCode) {
      headers['x-affiliate-code'] = affiliateCode;
    }
    
    const api = withPaymentInterceptor(
      axios.create({
        baseURL: process.env.NEXT_PUBLIC_HOST_NAME,
        withCredentials: true,
        headers: headers
        
      }),
      account as any as Wallet,
    );

    if (affiliateCode) {
      // Get affiliate details
      const affiliateResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_HOST_NAME}/api/affiliates/code/${affiliateCode}`
      );
      const affiliate = affiliateResponse.data;

      // Calculate amounts
      const affiliateAmount = Number((totalAmount * affiliate.affiliate.commissionRate / 100).toFixed(4));
      const sellerAmount = Number((totalAmount - affiliateAmount).toFixed(4));

      console.log("Affiliate details:", {
        affiliate,
        affiliateAmount,
        sellerAmount,
        totalAmount
      });

      // Create URL objects for better parameter handling
      const affiliateUrl = new URL(`/api/listings/${id}/purchase`, process.env.NEXT_PUBLIC_HOST_NAME);
      affiliateUrl.searchParams.set('addressTo', affiliate?.affiliate.affiliateUser?.wallet);
      affiliateUrl.searchParams.set('amount', affiliateAmount.toString());

      const sellerUrl = new URL(`/api/listings/${id}/purchase`, process.env.NEXT_PUBLIC_HOST_NAME);
      sellerUrl.searchParams.set('addressTo', listing?.sellerWallet);
      sellerUrl.searchParams.set('amount', sellerAmount.toString());

      // Make API calls using the formatted URLs
      console.log('Making API call with:', {
        url: sellerUrl.toString(),
        addressTo: listing.sellerWallet,
        amount: sellerAmount,
        headers: headers
      });
      await api.post(affiliateUrl.pathname + affiliateUrl.search);
      const sellerRes = await api.post(sellerUrl.pathname + sellerUrl.search);

      return sellerRes.data;
    } else {
      // Regular purchase without affiliate
      const url = new URL(`/api/listings/${id}/purchase`, process.env.NEXT_PUBLIC_HOST_NAME);
      url.searchParams.set('addressTo', listing.sellerWallet);
      url.searchParams.set('amount', totalAmount.toString());

      console.log('Making API call with:', {
        url: url.toString(),
        addressTo: listing.sellerWallet,
        amount: totalAmount,
        headers: headers
      });
      const res = await api.post(url.pathname + url.search);
      return res.data;
    }

  } catch (err) {
    console.log("Error fetching wallet:", err);
    throw new Error("Failed to fetch wallet");
  }
}

export async function purchaseMonetizedLink(wallet: `0x${string}`, id: string) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      throw new Error("User not authenticated");
    }

    const cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      walletSecret: process.env.CDP_WALLET_SECRET,
    });

    const account = await cdp.evm.getAccount({ address: wallet });

    console.log("account", account);

    const api = withPaymentInterceptor(
      axios.create({
        baseURL: process.env.NEXT_PUBLIC_HOST_NAME,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session.user.id,
          'x-user-email': session.user.email || '',
        }
      }),
      account as any as Wallet,
    );

    const res = await api.post(`/api/shared-links/${id}/pay`)

    return res.data;

  } catch (err: any) {
    console.log("Error in purchaseMonetizedLink:", err);
    
    if (err.message?.includes('account') || err.message?.includes('wallet')) {
      throw new Error(`Wallet connection failed: ${err.message}`);
    }
    
    throw new Error(`Payment failed: ${err.message || 'Unknown error'}`);
  }
}
