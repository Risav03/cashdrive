import { processFileForAI } from '@/app/lib/ai/aiService';
import { Item, Listing, Transaction, User } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import { copyItemWithBFS } from '@/app/lib/utils/itemUtils';
import { Affiliate } from '@/app/models/Affiliate';
import { Commission } from '@/app/models/Commission';
import { Types } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

interface PaymentResponse {
  transaction: string;
  network: string;
  payer: string;
  success: boolean;
}

interface QueueItem {
  originalId: string;
  newParentId: string;
  name: string;
}

interface CopiedItemResult {
  _id: Types.ObjectId;
  name: string;
  path: string;
}

interface ItemDocument {
  _id: Types.ObjectId;
  name: string;
  type: string;
  parentId: string;
  size?: number;
  mimeType?: string;
  url?: string;
  owner: string;
  contentSource?: string;
}

interface ListingDocument {
  _id: Types.ObjectId;
  status: string;
  price: number;
  title: string;
  affiliateEnabled?: boolean;
  seller: {
    _id: Types.ObjectId;
  };
  item: {
    _id: Types.ObjectId;
  };
}

const generateReceiptNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RCP-${timestamp}-${random}`;
};

const parsePaymentResponse = (paymentResponseHeader: string | null): PaymentResponse | null => {
  if (!paymentResponseHeader) return null;
  
  try {
    return JSON.parse(paymentResponseHeader);
  } catch (error) {
    console.error('Error parsing x-payment-response:', error);
    return null;
  }
};

async function getOrCreateMarketplaceFolder(buyerId: string): Promise<Types.ObjectId> {
  const buyer = await User.findById(buyerId);
  if (!buyer?.rootFolder) {
    throw new Error('Buyer root folder not found');
  }

  const marketplaceFolder = await Item.findOneAndUpdate(
    {
      name: 'marketplace',
      type: 'folder',
      parentId: buyer.rootFolder.toString(),
      owner: buyerId
    },
    {},
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );

  return marketplaceFolder._id;
}

async function copyPurchasedItem(originalItemId: string, newParentId: string, buyerId: string): Promise<CopiedItemResult> {
  const copiedItem = await copyItemWithBFS(originalItemId, newParentId, buyerId, '(Purchased)');
  return {
    _id: copiedItem._id,
    name: copiedItem.name,
    path: `/marketplace/${copiedItem.name}`
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userIdFromHeader = request.headers.get('x-user-id');
    const userEmailFromHeader = request.headers.get('x-user-email');
    const affiliateCodeFromHeader = request.headers.get('x-affiliate-code');
    
    if (!userIdFromHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const params = await context.params;
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 });
    }

    const listing = await Listing.findById(id)
      .populate('item')
      .populate('seller')
      .lean<ListingDocument>();

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.status !== 'active') {
      return NextResponse.json({ 
        error: 'This listing is no longer available for purchase' 
      }, { status: 400 });
    }

    if (listing.seller._id.toString() === userIdFromHeader) {
      return NextResponse.json({ 
        error: 'You cannot purchase your own listing' 
      }, { status: 400 });
    }

    const existingTransaction = await Transaction.exists({
      listing: id,
      buyer: userIdFromHeader,
      status: 'completed'
    });

    if (existingTransaction) {
      return NextResponse.json({ 
        error: 'You have already purchased this item' 
      }, { status: 400 });
    }

    const paymentResponse = parsePaymentResponse(
      request.headers.get('x-payment-response')
    );
    
    const transaction = await Transaction.create({
      listing: listing._id,
      buyer: userIdFromHeader,
      seller: listing.seller._id,
      item: listing.item._id,
      amount: listing.price,
      status: 'completed',
      transactionId: uuidv4(),
      receiptNumber: generateReceiptNumber(),
      purchaseDate: new Date(),
      transactionType: 'purchase',
      paymentFlow: 'direct',
      metadata: paymentResponse ? {
        blockchainTransaction: paymentResponse.transaction,
        network: paymentResponse.network,
        payer: paymentResponse.payer,
        success: paymentResponse.success,
        paymentResponseRaw: request.headers.get('x-payment-response')
      } : undefined
    });

    const marketplaceFolderId = await getOrCreateMarketplaceFolder(userIdFromHeader);
    const copiedItem = await copyPurchasedItem(listing.item._id.toString(), marketplaceFolderId.toString(), userIdFromHeader);

    // Automatically process the purchased file for AI use
    try {
      // Mark the file as marketplace content
      await Item.findByIdAndUpdate(copiedItem._id, {
        contentSource: 'marketplace_purchase'
      });
      
      // Process the file for AI
      await processFileForAI(copiedItem._id.toString());
    } catch (processError) {
      console.error('Error auto-processing purchased content for AI:', processError);
      // Don't fail the purchase if AI processing fails
    }

    let commission = null;
    let commissionTransaction = null;
    let sellerTransaction = null;
    
    if (affiliateCodeFromHeader && listing.affiliateEnabled) {
      try {
        const [affiliate] = await Promise.all([
          Affiliate.findOne({
            affiliateCode: affiliateCodeFromHeader,
            listing: id,
            status: 'active'
          }),
          transaction.populate([
            { path: 'listing', select: 'title price' },
            { path: 'buyer', select: 'name email' },
            { path: 'seller', select: 'name email' },
            { path: 'item', select: 'name type size mimeType' }
          ])
        ]);

        if (affiliate && affiliate.affiliateUser.toString() !== userIdFromHeader) {
          const commissionAmount = (listing.price * affiliate.commissionRate) / 100;
          const sellerAmount = listing.price - commissionAmount;
          
          // Create commission transaction record (platform pays affiliate)
          commissionTransaction = await Transaction.create({
            listing: listing._id,
            buyer: listing.seller._id, // platform/original seller pays
            seller: affiliate.affiliateUser, // affiliate receives
            item: listing.item._id,
            amount: commissionAmount,
            status: 'pending',
            transactionId: uuidv4(),
            receiptNumber: generateReceiptNumber(),
            purchaseDate: new Date(),
            transactionType: 'commission',
            paymentFlow: 'admin',
            parentTransaction: transaction._id,
            metadata: {
              affiliateCode: affiliateCodeFromHeader,
              commissionRate: affiliate.commissionRate,
              originalPurchaseAmount: listing.price,
              originalBuyer: userIdFromHeader
            }
          });

          // Create seller transaction record (platform pays seller)
          sellerTransaction = await Transaction.create({
            listing: listing._id,
            buyer: listing.seller._id, // platform/original seller pays (self-transaction for accounting)
            seller: listing.seller._id, // original seller receives
            item: listing.item._id,
            amount: sellerAmount,
            status: 'pending',
            transactionId: uuidv4(),
            receiptNumber: generateReceiptNumber(),
            purchaseDate: new Date(),
            transactionType: 'sale',
            paymentFlow: 'admin',
            parentTransaction: transaction._id,
            metadata: {
              isAffiliateDistribution: true,
              originalPurchaseAmount: listing.price,
              commissionDeducted: commissionAmount,
              originalBuyer: userIdFromHeader
            }
          });

          // Update original transaction with affiliate info
          await Transaction.findByIdAndUpdate(transaction._id, {
            affiliateInfo: {
              isAffiliateSale: true,
              originalAmount: listing.price,
              netAmount: sellerAmount,
              commissionDistribution: [{
                affiliateId: affiliate._id,
                amount: commissionAmount,
                commissionRate: affiliate.commissionRate
              }]
            }
          });

          // Create commission record linking to commission transaction
          [commission] = await Promise.all([
            Commission.create({
              affiliate: affiliate._id,
              originalTransaction: transaction._id,
              commissionTransaction: commissionTransaction._id,
              commissionRate: affiliate.commissionRate,
              commissionAmount,
              status: 'pending'
            }),
            Affiliate.findByIdAndUpdate(affiliate._id, {
              $inc: { 
                totalEarnings: commissionAmount,
                totalSales: 1
              }
            })
          ]);
        }
      } catch (affiliateError) {
        console.error('Error processing affiliate commission:', affiliateError);
      }
    } else {
      await transaction.populate([
        { path: 'listing', select: 'title price' },
        { path: 'buyer', select: 'name email' },
        { path: 'seller', select: 'name email' },
        { path: 'item', select: 'name type size mimeType' }
      ]);
    }

    return NextResponse.json({
      transactionData: {
        transaction,
        copiedItem,
        paymentDetails: paymentResponse,
        message: 'Purchase completed successfully',
        affiliateCommission: commission ? {
          commission: commission,
          amount: commission.commissionAmount,
          rate: commission.commissionRate,
          commissionTransaction: commissionTransaction,
          sellerTransaction: sellerTransaction
        } : null
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/listings/[id]/purchase error:', error);
    
    const status = 
      error.code === 11000 ? 400 :
      error.message === 'Buyer root folder not found' ? 404 :
      error.message === 'Original item not found' ? 404 : 500;
    
    const message = 
      error.code === 11000 ? 'Transaction already exists' :
      error.message || 'Failed to complete purchase';
    
    return NextResponse.json({ error: message }, { status });
  }
} 