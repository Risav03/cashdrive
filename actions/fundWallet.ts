"use server"
import { CdpClient } from "@coinbase/cdp-sdk";

export async function fundWallet(wallet: `0x${string}`) {
    try{
        const cdp = new CdpClient({
            apiKeyId: process.env.CDP_API_KEY_ID,
            apiKeySecret: process.env.CDP_API_KEY_SECRET,
            walletSecret: process.env.CDP_WALLET_SECRET,
        });

        const faucetResponse = await cdp.evm.requestFaucet({
            address: wallet,
            network: "base-sepolia",
            token: "usdc",
          });

        if (faucetResponse.transactionHash) {
            console.log(`Successfully funded wallet ${wallet} with USDC`);
            return faucetResponse;
        }
    }
    catch(err){
        console.error("Error funding wallet:", err);
        throw new Error("Failed to fund wallet");
    }
}