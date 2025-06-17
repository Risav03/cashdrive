"use server";

import { authOptions } from '@/app/lib/backend/authConfig';
import { CdpClient } from "@coinbase/cdp-sdk";
import axios from "axios";
import { getServerSession } from 'next-auth/next';
import { withPaymentInterceptor } from "x402-axios";
import type { Wallet } from "x402/types";

export async function purchaseFromMarketplace(wallet: `0x${string}`, id: string, affiliateCode?: string) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      throw new Error("User not authenticated");
    }

    if (!wallet || !wallet.startsWith('0x')) {
      throw new Error("Invalid wallet address");
    }

    const cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      walletSecret: process.env.CDP_WALLET_SECRET,
    });

    console.log("Attempting to get account for wallet:", wallet);
    const account = await cdp.evm.getAccount({ address: wallet });

    console.log("account", account);

    const headers: any = {
      'Content-Type': 'application/json',
      'x-user-id': session.user.id,
      'x-user-email': session.user.email || '',
    };

    if (affiliateCode) {
      headers['x-affiliate-code'] = affiliateCode;
    }

    const api = withPaymentInterceptor(
      axios.create({
        baseURL: process.env.NEXT_PUBLIC_HOST_NAME,
        withCredentials: true,
        headers
      }),
      account as any as Wallet,
    );

    const res = await api.post(`/api/listings/${id}/purchase`)

    return res.data;

  } catch (err: any) {
    console.log("Error in purchaseFromMarketplace:", err);
    
    if (err.message === "Invalid wallet address") {
      throw new Error("Invalid wallet address. Please check your wallet connection.");
    }
    
    if (err.message === "User not authenticated") {
      throw new Error("User not authenticated. Please log in again.");
    }
    
    // More specific CDP errors
    if (err.message?.includes('account') || err.message?.includes('wallet')) {
      throw new Error(`Wallet connection failed: ${err.message}`);
    }
    
    throw new Error(`Purchase failed: ${err.message || 'Unknown error'}`);
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
