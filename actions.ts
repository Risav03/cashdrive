'use server'

import { CdpClient } from "@coinbase/cdp-sdk";
import axios from "axios";
import { withPaymentInterceptor, decodeXPaymentResponse } from "x402-axios";
import type { Wallet } from "x402/types";

export async function getWallet(wallet:`0x${string}`, id:string){
    try{
        const cdp = new CdpClient({
            apiKeyId: process.env.CDP_API_KEY_ID,
            apiKeySecret: process.env.CDP_API_KEY_SECRET,
            walletSecret: process.env.CDP_WALLET_SECRET,
          });
      
          const account = await cdp.evm.getAccount({address: wallet});

        const api = withPaymentInterceptor(
            axios.create({
              baseURL: process.env.NEXT_PUBLIC_HOST_NAME, // e.g. https://api.example.com
            }),
            account as any as Wallet, // Ensure the account is compatible with the Wallet type
          );
          
          api
            .post(`/api/listings/${id}/purchase`) // e.g. /paid-endpoint
            .then((response:any) => {
              console.log(response.data);
          
              const paymentResponse = decodeXPaymentResponse(response.headers["x-payment-response"]);
              console.log(paymentResponse);
            })
            .catch((error:any) => {
              console.error(error.response?.data?.error);
            });   }
    catch(err){
        console.log("Error fetching wallet:", err);
        throw new Error("Failed to fetch wallet");
    }
}