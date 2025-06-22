"use server";

import { authOptions } from '@/app/lib/backend/authConfig';
import { getListingDetails } from '@/app/utils/listingDetailFetcher';
import { CdpClient } from "@coinbase/cdp-sdk";
import axios from "axios";
import { ethers } from 'ethers';
import { getServerSession } from 'next-auth/next';
import { parseUnits } from 'viem';
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

    var affiliate
    // Check affiliate code if provided
    if (affiliateCode) {
      const affiliateResponse = await axios.get(`${process.env.NEXT_PUBLIC_HOST_NAME}/api/affiliates/code/${affiliateCode}`);
      if (!affiliateResponse.data.affiliate) {
        throw new Error("Invalid affiliate code");
      }

      affiliate = affiliateResponse.data.affiliate;
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

    // Modified post call with affiliate param if needed
    const url = `/api/listings/${id}/purchase${affiliateCode ? '?affiliateProvided=true' : ''}`;
    const res = await api.post(url);

    if(affiliateCode && res.data?.transactionData?.affiliateCommission) {
      try {
        const account2 = await cdp.evm.getAccount({ address: "0x4FA2D62E28f46b3321366a6D5497acEd5a7E12FD" });
        console.log("Affiliate", affiliate);
        
        const { commissionTransaction, sellerTransaction } = res.data.transactionData.affiliateCommission;
        const amount = affiliate?.commissionRate;
        const listing = await getListingDetails(id);
        console.log("Listing", listing);

        // Calculate amounts with proper decimal handling
        const listingPrice = Number(listing.price);
        const affiliateAmount = (amount * listingPrice) / 100;
        const sellerAmount = listingPrice - affiliateAmount;

        // Format amounts to fixed 2 decimal places before parsing
        const parsedAffAmount = parseUnits(affiliateAmount.toFixed(2), 6);
        const parsedSellerAmount = parseUnits(sellerAmount.toFixed(2), 6);

        console.log("Transfer amounts:", {
          total: listingPrice,
          affiliate: affiliateAmount,
          seller: sellerAmount,
          parsedAff: parsedAffAmount.toString(),
          parsedSeller: parsedSellerAmount.toString()
        });

        // Check balance before transfer
        const balance = await account2.listTokenBalances({network: "base-sepolia"});
        console.log("Account balance:", balance.balances);

        if (Number(balance) < listingPrice) {
          throw new Error(`Insufficient balance. Required: ${listingPrice} USDC, Available: ${balance} USDC`);
        }

        // Execute transfers
        const txn1 = await account2.transfer({
          to: affiliate.affiliateUser.wallet,
          amount: parsedAffAmount,
          token: "usdc",
          network: "base-sepolia",
        });

        const txn2 = await account2.transfer({
          to: listing.sellerWallet,
          amount: parsedSellerAmount,
          token: "usdc",
          network: "base-sepolia",
        });

        console.log("Transfers completed:", {
          affiliateTxn: txn1,
          sellerTxn: txn2
        });

        // Extract transaction hashes
        const affiliateTxHash = txn1.transactionHash;
        const sellerTxHash = txn2.transactionHash;

        console.log("Transaction hashes:", {
          affiliateTxHash,
          sellerTxHash
        });

        // Update transaction statuses after successful blockchain transfers
        // Import necessary models at the top of the file
        const { Transaction } = await import("@/app/models/Transaction");
        const { Commission } = await import("@/app/models/Commission");
        const connectDB = await import("@/app/lib/mongodb");
        
        await connectDB.default();
        
        await Promise.all([
          // Update commission transaction directly in DB
          Transaction.findByIdAndUpdate(commissionTransaction._id, {
            status: 'completed',
            metadata: {
              ...commissionTransaction.metadata,
              blockchainTransaction: affiliateTxHash,
              network: "base-sepolia",
              payer: "0x4FA2D62E28f46b3321366a6D5497acEd5a7E12FD", // Admin wallet that sends the funds
              paymentFlow: 'admin',
              success: true,
              transferResponse: txn1
            }
          }),
          
          // Update seller transaction directly in DB
          Transaction.findByIdAndUpdate(sellerTransaction._id, {
            status: 'completed',
            metadata: {
              ...sellerTransaction.metadata,
              blockchainTransaction: sellerTxHash,
              network: "base-sepolia", 
              payer: "0x4FA2D62E28f46b3321366a6D5497acEd5a7E12FD", // Admin wallet that sends the funds
              paymentFlow: 'admin',
              success: true,
              transferResponse: txn2
            }
          }),

          // Update commission record directly in DB
          Commission.findByIdAndUpdate(res.data.transactionData.affiliateCommission.commission._id, {
            status: 'paid',
            paidAt: new Date()
          })
        ]);

      } catch (err:any) {
        console.error("Error in affiliate payment:", err);
        
        // Update transaction statuses to failed if blockchain transfers fail
        if (res.data?.transactionData?.affiliateCommission) {
          const { commissionTransaction, sellerTransaction } = res.data.transactionData.affiliateCommission;
          
          try {
            const { Transaction } = await import("@/app/models/Transaction");
            const { Commission } = await import("@/app/models/Commission");
            const connectDB = await import("@/app/lib/mongodb");
            
            await connectDB.default();
            
            await Promise.all([
              Transaction.findByIdAndUpdate(commissionTransaction._id, {
                status: 'failed',
                metadata: {
                  ...commissionTransaction.metadata,
                  success: false,
                  failureReason: err.message
                }
              }),
              
              Transaction.findByIdAndUpdate(sellerTransaction._id, {
                status: 'failed',
                metadata: {
                  ...sellerTransaction.metadata,
                  success: false,
                  failureReason: err.message
                }
              }),

              Commission.findByIdAndUpdate(res.data.transactionData.affiliateCommission.commission._id, {
                status: 'failed'
              })
            ]);
          } catch (updateError) {
            console.error("Error updating transaction statuses:", updateError);
          }
        }
        
        throw new Error(`Affiliate payment failed: ${err.message}`);
      }
    }

    return res.data;
  } catch (err: any) {
    if (err.response) {
      throw new Error(`Purchase failed: ${err.response.data.error || err.message}`);
    } else if (err.request) {
      throw new Error('Purchase failed: No response from server');
    } else {
      throw new Error(`Purchase failed: ${err.message || 'Unknown error'}`);
    }
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

    const res = await api.post(`/api/shared-links/${id}/purchase`)

    return res.data;

  } catch (err: any) {
    console.log("Error in purchaseMonetizedLink:", err);
    
    if (err.message?.includes('account') || err.message?.includes('wallet')) {
      throw new Error(`Wallet connection failed: ${err.message}`);
    }
    
    throw new Error(`Payment failed: ${err.message || 'Unknown error'}`);
  }
}
