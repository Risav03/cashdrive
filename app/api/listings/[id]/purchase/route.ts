import { Item, Listing, Transaction, User } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
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

async function copyItemWithBFS(originalItemId: string, newParentId: string, buyerId: string): Promise<CopiedItemResult> {
  const originalItem = await Item.findById(originalItemId).lean<ItemDocument>();
  if (!originalItem) {
    throw new Error('Original item not found');
  }

  const queue: QueueItem[] = [];

  const idMap = new Map<string, string>();

  const rootCopy = await Item.create({
    name: `${originalItem.name} (Purchased)`,
    type: originalItem.type,
    parentId: newParentId,
    size: originalItem.size || 0,
    mimeType: originalItem.mimeType,
    url: originalItem.url,
    owner: buyerId,
    contentSource: 'marketplace_purchase'
  });

  if (originalItem.type === 'folder') {
    queue.push({
      originalId: originalItem._id.toString(),
      newParentId: rootCopy._id.toString(),
      name: originalItem.name
    });
    idMap.set(originalItem._id.toString(), rootCopy._id.toString());
  }

  while (queue.length > 0) {
    const batch = queue.splice(0, 10);
    

    const children = await Item.find({
      parentId: { $in: batch.map(item => item.originalId) }
    }).lean<ItemDocument[]>();

    const childrenByParent = children.reduce((acc, child) => {
      const parentId = child.parentId.toString();
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push(child);
      return acc;
    }, {} as Record<string, ItemDocument[]>);

    const copyPromises = batch.flatMap(parent => {
      const parentChildren = childrenByParent[parent.originalId] || [];
      return parentChildren.map(async child => {
        const newParentId = idMap.get(parent.originalId)!;
        
        const copy = await Item.create({
          name: child.name,
          type: child.type,
          parentId: newParentId,
          size: child.size || 0,
          mimeType: child.mimeType,
          url: child.url,
          owner: buyerId,
          contentSource: 'marketplace_purchase'
        });

        if (child.type === 'folder') {
          queue.push({
            originalId: child._id.toString(),
            newParentId: copy._id.toString(),
            name: child.name
          });
          idMap.set(child._id.toString(), copy._id.toString());
        }
      });
    });

    await Promise.all(copyPromises);
  }

  return {
    _id: rootCopy._id,
    name: rootCopy.name,
    path: `/marketplace/${rootCopy.name}`
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
    const copiedItem = await copyItemWithBFS(listing.item._id.toString(), marketplaceFolderId.toString(), userIdFromHeader);

    let commission = null;
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
          
          [commission] = await Promise.all([
            Commission.create({
              affiliate: affiliate._id,
              originalTransaction: transaction._id,
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
          amount: commission.commissionAmount,
          rate: commission.commissionRate
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