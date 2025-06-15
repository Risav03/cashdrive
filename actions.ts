'use server'

import { CdpClient } from "@coinbase/cdp-sdk";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";

export async function getWallet(wallet:`0x${string}`, id:string){
    try{
        const cdp = new CdpClient({
            apiKeyId: process.env.CDP_API_KEY_ID,
            apiKeySecret: process.env.CDP_API_KEY_SECRET,
            walletSecret: process.env.CDP_WALLET_SECRET,
          });
      
          console.log(cdp)
      
          const account = await cdp.evm.getAccount({address: wallet});
      
          console.log(account);


          const fetchWithPayment = wrapFetchWithPayment(fetch, account as any);

fetchWithPayment(`${process.env.NEXT_PUBLIC_HOST_NAME as string}/api/listings/${id}/purchase`, { //url should be something like https://api.example.com/paid-endpoint
  method: "GET",
})
  .then(async response => {
    const body = await response.json();
    console.log("body",body);

    const paymentResponse = decodeXPaymentResponse(response.headers.get("x-payment-response")!);
    console.log(paymentResponse);
  })
  .catch(error => {
    console.error(error.response?.data?.error);
  });
    }
    catch(err){
        console.log("Error fetching wallet:", err);
        throw new Error("Failed to fetch wallet");
    }
}