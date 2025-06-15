"use server";

import { authOptions } from '@/app/lib/backend/authConfig';
import { CdpClient } from "@coinbase/cdp-sdk";
import axios from "axios";
import { getServerSession } from 'next-auth/next';
import { withPaymentInterceptor } from "x402-axios";
import type { Wallet } from "x402/types";

export async function purchaseFromMarketplace(wallet: `0x${string}`, id: string) {
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

    const res = await api.post(`/api/listings/${id}/purchase`)

    return res.data;


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


  } catch (err) {
    console.log("Error fetching wallet:", err);
    throw new Error("Failed to fetch wallet");
  }
}
