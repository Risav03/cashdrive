import { Item, Listing, Transaction, User } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import { Affiliate } from '@/app/models/Affiliate';
import { AffiliateTransaction } from '@/app/models/AffiliateTransaction';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { CdpClient } from "@coinbase/cdp-sdk";
import { getUSDCBalanceServer } from '@/app/lib/backend/helperFunctions/blockchainUtils';

function generateReceiptNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RCP-${timestamp}-${random}`;
}

function parsePaymentResponse(paymentResponseHeader: string | null) {
  if (!paymentResponseHeader) {
    return null;
  }
  
  try {
    return JSON.parse(paymentResponseHeader);
  } catch (error) {
    console.error('Error parsing x-payment-response:', error);
    return null;
  }
}

async function copyItemToMarketplaceFolder(buyerId: string, item: any): Promise<any> {
  try {
    const buyer = await User.findById(buyerId);
    if (!buyer) {
      throw new Error('Buyer not found');
    }

    let marketplaceFolder = await Item.findOne({
      name: 'marketplace',
      type: 'folder',
      parentId: buyer.rootFolder.toString()
    });

    if (!marketplaceFolder) {
      marketplaceFolder = await Item.create({
        name: 'marketplace',
        type: 'folder',
        parentId: buyer.rootFolder.toString(),
        owner: buyerId
      });
    }

    const copiedItem = await copyItemRecursively(item, marketplaceFolder._id.toString(), buyerId);
    return copiedItem;
  } catch (error) {
    console.error('Error copying item to marketplace folder:', error);
    throw error;
  }
}

async function copyItemRecursively(originalItem: any, newParentId: string, buyerId: string): Promise<any> {
  const copiedItem = await Item.create({
    name: `${originalItem.name} (Purchased)`,
    type: originalItem.type,
    parentId: newParentId,
    size: originalItem.size || 0,
    mimeType: originalItem.mimeType,
    url: originalItem.url,
    owner: buyerId
  });

  if (originalItem.type === 'folder') {
    const children = await Item.find({ parentId: originalItem._id.toString() });
    
    for (const child of children) {
      await copyItemRecursively(child, copiedItem._id.toString(), buyerId);
    }
  }

  return copiedItem;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userIdFromHeader = request.headers.get('x-user-id');
    const userEmailFromHeader = request.headers.get('x-user-email');
    const affiliateCodeFromHeader = request.headers.get('x-affiliate-code');
    
    let userId: string | undefined;
    let userEmail: string | undefined;

    if (userIdFromHeader && userEmailFromHeader) {
      userId = userIdFromHeader;
      userEmail = userEmailFromHeader;
      console.log('Using session from headers:', { userId, userEmail });
    } 
    // else {
    //   // Fallback to getServerSession (for direct API calls)
    //   const session = await getServerSession(authOptions);
    //   console.log("______--------______");
    //   console.log("______--------______");
    //   console.log("______--------______");
    //   console.log("______--------______");

    //   console.log('Session:', session);
    //   if (!session?.user?.id) {
    //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    //   }
    //   userId = session.user.id;
    //   userEmail = session.user.email || undefined;
    // }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const params = await context.params;
    const listing = await Listing.findById(params.id)
      .populate('item')
      .populate('seller');

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.status !== 'active') {
      return NextResponse.json({ 
        error: 'This listing is no longer available for purchase' 
      }, { status: 400 });
    }

    if (listing.seller._id.toString() === userId) {
      return NextResponse.json({ 
        error: 'You cannot purchase your own listing' 
      }, { status: 400 });
    }

    const existingTransaction = await Transaction.findOne({
      listing: params.id,
      buyer: userId,
      status: 'completed'
    });

    if (existingTransaction) {
      return NextResponse.json({ 
        error: 'You have already purchased this item' 
      }, { status: 400 });
    }

    const paymentResponseHeader = request.headers.get('x-payment-response');
    const paymentResponse = parsePaymentResponse(paymentResponseHeader);
    
    console.log("Payment response from header:", paymentResponse);
    
    const transactionId = uuidv4();
    const receiptNumber = generateReceiptNumber();

    const transactionData: any = {
      listing: listing._id,
      buyer: userId,
      seller: listing.seller._id,
      item: listing.item._id,
      amount: listing.price,
      status: 'completed',
      transactionId,
      receiptNumber,
      purchaseDate: new Date()
    };

    if (paymentResponse) {
      transactionData.metadata = {
        blockchainTransaction: paymentResponse.transaction,
        network: paymentResponse.network,
        payer: paymentResponse.payer,
        success: paymentResponse.success,
        paymentResponseRaw: paymentResponseHeader
      };
    }

    const transaction = await Transaction.create(transactionData);
      
    const copiedItem = await copyItemToMarketplaceFolder(userId, listing.item);

    // Handle affiliate commission if applicable
    let affiliateTransaction = null;
    if (affiliateCodeFromHeader) {
      try {
        const affiliate = await Affiliate.findOne({
          affiliateCode: affiliateCodeFromHeader,
          listing: listing._id,
          status: 'active'
        }).populate('affiliateUser', 'name email wallet')
          .populate('owner', 'name email wallet');

        if (affiliate && affiliate.affiliateUser.toString() !== userId) {
          const commissionAmount = (listing.price * affiliate.commissionRate) / 100;
          
          // Create affiliate transaction record
          affiliateTransaction = await AffiliateTransaction.create({
            affiliate: affiliate._id,
            originalTransaction: transaction._id,
            affiliateUser: affiliate.affiliateUser._id,
            owner: affiliate.owner._id,
            buyer: userId,
            saleAmount: listing.price,
            commissionRate: affiliate.commissionRate,
            commissionAmount,
            affiliateCode: affiliateCodeFromHeader,
            status: 'pending',
            metadata: {
              originalTransactionId: transaction._id,
              listingId: listing._id,
              createdFromPurchase: true,
              autoPayoutAttempted: true
            }
          });

          // AUTO COMMISSION PAYOUT - Process AFTER purchase completion
          try {
            console.log(`Attempting auto-payout of ${commissionAmount} from seller to affiliate ${affiliate.affiliateUser.email}`);
            
            // Validate affiliate has a wallet
            if (!affiliate.affiliateUser.wallet || !affiliate.affiliateUser.wallet.startsWith('0x')) {
              throw new Error('Affiliate does not have a valid wallet address');
            }

            // Validate seller has a wallet  
            if (!affiliate.owner.wallet || !affiliate.owner.wallet.startsWith('0x')) {
              throw new Error('Content owner does not have a valid wallet address');
            }

            // Only proceed if the main purchase was successful
            if (paymentResponse && paymentResponse.success && transaction.status === 'completed') {
              const cdp = new CdpClient({
                apiKeyId: process.env.CDP_API_KEY_ID,
                apiKeySecret: process.env.CDP_API_KEY_SECRET,
                walletSecret: process.env.CDP_WALLET_SECRET,
              });

              // Get the seller's account (they received the payment, now pay commission)
              const sellerAccount = await cdp.evm.getAccount({ address: affiliate.owner.wallet });
              
              // Check seller's USDC balance using our server-side helper
              const balanceFloat = await getUSDCBalanceServer(affiliate.owner.wallet);
              console.log(`Seller USDC balance: ${balanceFloat} USDC, commission needed: ${commissionAmount} USDC`);
              
              // No gas buffer needed since CDP handles gas fees
              if (balanceFloat < commissionAmount) {
                throw new Error(`Insufficient USDC funds: seller has ${balanceFloat} USDC but needs ${commissionAmount} USDC for commission`);
              }
              
              // Transfer commission from seller to affiliate
              const commissionTransfer = await sellerAccount.transfer({
                to: affiliate.affiliateUser.wallet,
                amount: BigInt(Math.floor(commissionAmount * 10**6)), // Convert to USDC wei (6 decimals)
                token: 'usdc',
                network: 'base-sepolia'
              });

              // Update affiliate transaction as paid with blockchain proof
              await AffiliateTransaction.findByIdAndUpdate(affiliateTransaction._id, {
                status: 'paid',
                paidAt: new Date(),
                metadata: {
                  ...affiliateTransaction.metadata,
                  autoPayoutSuccess: true,
                  paymentTransaction: commissionTransfer.transactionHash,
                  paymentNetwork: 'base-sepolia', // Default to base-sepolia since network property doesn't exist
                  processedAt: new Date(),
                  paymentMethod: 'auto_payout_from_seller',
                  sellerBalance: balanceFloat,
                  mainPurchaseTx: paymentResponse.transaction
                }
              });

              console.log(`✅ Auto-payout successful! Commission ${commissionAmount} USDC sent from seller ${affiliate.owner.email} to affiliate ${affiliate.affiliateUser.email} - TX: ${commissionTransfer.transactionHash}`);
              
            } else {
              throw new Error('Main purchase not completed successfully - cannot process commission');
            }

          } catch (autoPayoutError: any) {
            console.error('Auto-payout failed, keeping as pending:', autoPayoutError);
            
            // Update metadata to indicate auto-payout failed
            await AffiliateTransaction.findByIdAndUpdate(affiliateTransaction._id, {
              metadata: {
                ...affiliateTransaction.metadata,
                autoPayoutFailed: true,
                autoPayoutError: autoPayoutError.message,
                failedAt: new Date(),
                requiresManualPayout: true,
                mainPurchaseSuccessful: paymentResponse?.success || false
              }
            });
          }

          // Update affiliate stats regardless of payout success
          await Affiliate.findByIdAndUpdate(affiliate._id, {
            $inc: { 
              totalEarnings: commissionAmount,
              totalSales: 1
            }
          });

          console.log(`Created affiliate transaction ${affiliateTransaction._id} for ${commissionAmount} commission`);
        }
      } catch (affiliateError) {
        console.error('Error processing affiliate commission:', affiliateError);
        // Don't fail the main transaction for affiliate errors
      }
    }

    await transaction.populate('listing', 'title price');
    await transaction.populate('buyer', 'name email');
    await transaction.populate('seller', 'name email');
    await transaction.populate('item', 'name type size mimeType');

    // Refresh affiliate transaction to get latest status
    if (affiliateTransaction) {
      affiliateTransaction = await AffiliateTransaction.findById(affiliateTransaction._id);
    }

    return NextResponse.json({
      transaction,
      copiedItem: {
        _id: copiedItem._id,
        name: copiedItem.name,
        path: `/marketplace/${copiedItem.name}`
      },
      paymentDetails: paymentResponse,
      affiliateCommission: affiliateTransaction ? {
        amount: affiliateTransaction.commissionAmount,
        rate: affiliateTransaction.commissionRate,
        status: affiliateTransaction.status,
        autoPayoutSuccess: affiliateTransaction.metadata?.autoPayoutSuccess || false,
        autoPayoutFailed: affiliateTransaction.metadata?.autoPayoutFailed || false,
        paymentTransaction: affiliateTransaction.metadata?.paymentTransaction,
        autoPayoutError: affiliateTransaction.metadata?.autoPayoutError
      } : null,
      message: 'Purchase completed successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/listings/[id]/purchase error:', error);
    
    if (error.code === 11000) {
      return NextResponse.json({ 
        error: 'Transaction already exists' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to complete purchase' 
    }, { status: 500 });
  }
} 