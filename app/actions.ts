'use server'
import { CdpClient } from "@coinbase/cdp-sdk";

export async function getWallet(wallet:`0x${string}`){
    try{
        const cdp = new CdpClient({
            apiKeyId: process.env.CDP_API_KEY_ID,
            apiKeySecret: process.env.CDP_API_KEY_SECRET,
            walletSecret: process.env.CDP_WALLET_SECRET,
          });
      
          console.log(cdp)
      
          const account = await cdp.evm.getAccount({address: wallet});
      
          console.log(account);

          return account;
    }
    catch(err){
        console.log("Error fetching wallet:", err);
        throw new Error("Failed to fetch wallet");
    }
}