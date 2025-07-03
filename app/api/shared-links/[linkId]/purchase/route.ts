import { SharedLink, Transaction } from '@/app/lib/models';
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

interface SharedLinkDocument {
  _id: Types.ObjectId;
  linkId: string;
  title: string;
  price: number;
  type: 'public' | 'monetized';
  isActive: boolean;
  expiresAt?: Date;
  paidUsers: Types.ObjectId[];
  affiliateEnabled: boolean;
  owner: {
    _id: Types.ObjectId;
    name: string;
    email: string;
    wallet: string;
  };
  item: {
    _id: Types.ObjectId;
    name: string;
    type: string;
    size: number;
    mimeType: string;
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

async function getSharedLinkWithAuth(
  linkId: string,
  userId?: string
): Promise<SharedLinkDocument> {
  const sharedLink = await SharedLink.findOne({ 
    linkId, 
    isActive: true,
    type: 'monetized'
  })
  .populate('owner', 'name email wallet')
  .populate('item', 'name type size mimeType')
  .lean<SharedLinkDocument>();

  if (!sharedLink) {
    throw new Error('Monetized link not found or expired');
  }

  if (sharedLink.expiresAt && new Date() > sharedLink.expiresAt) {
    throw new Error('Link has expired');
  }

  if (sharedLink.owner._id.toString() === userId) {
    throw new Error('You cannot purchase your own content');
  }

  const hasPaid = sharedLink.paidUsers.some(
    (paidUserId: Types.ObjectId) => paidUserId.toString() === userId
  );

  if (hasPaid) {
    throw new Error('You have already paid for this content');
  }

  return sharedLink;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const userIdFromHeader = request.headers.get('x-user-id');
    const userEmailFromHeader = request.headers.get('x-user-email');
    const affiliateCodeFromHeader = request.headers.get('x-affiliate-code');
    
    if (!userIdFromHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { linkId } = await params;
    if (!linkId) {
      return NextResponse.json({ error: 'Link ID is required' }, { status: 400 });
    }

    const sharedLink = await getSharedLinkWithAuth(linkId, userIdFromHeader);
    const paymentResponse = parsePaymentResponse(
      request.headers.get('x-payment-response')
    );
    
    const transaction = await Transaction.create({
      sharedLink: sharedLink._id,
      buyer: userIdFromHeader,
      seller: sharedLink.owner._id,
      item: sharedLink.item._id,
      amount: sharedLink.price,
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

    await SharedLink.findByIdAndUpdate(sharedLink._id, {
      $addToSet: { paidUsers: userIdFromHeader }
    });

    let commission = null;
    if (affiliateCodeFromHeader && sharedLink.affiliateEnabled) {
      try {
        const [affiliate] = await Promise.all([
          Affiliate.findOne({
            affiliateCode: affiliateCodeFromHeader,
            sharedLink: sharedLink._id,
            status: 'active'
          }),
          transaction.populate([
            { path: 'buyer', select: 'name email' },
            { path: 'seller', select: 'name email' },
            { path: 'item', select: 'name type size mimeType' }
          ])
        ]);

        if (affiliate && affiliate.affiliateUser.toString() !== userIdFromHeader) {
          const commissionAmount = (sharedLink.price * affiliate.commissionRate) / 100;
          
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
        { path: 'buyer', select: 'name email' },
        { path: 'seller', select: 'name email' },
        { path: 'item', select: 'name type size mimeType' }
      ]);
    }
    
    return NextResponse.json({
      transactionData: {
        transaction,
        paymentDetails: paymentResponse,
        message: 'Purchase completed successfully',
        sharedLink: {
          linkId: sharedLink.linkId,
          title: sharedLink.title
        },
        affiliateCommission: commission ? {
          amount: commission.commissionAmount,
          rate: commission.commissionRate
        } : null
      }
    }, { status: 201 });
      
  } catch (error: any) {
    console.error('POST /api/shared-links/[linkId]/purchase error:', error);
    
    const status = 
      error.code === 11000 ? 400 :
      error.message === 'Link has expired' ? 410 :
      error.message === 'Monetized link not found or expired' ? 404 : 500;
    
    const message = 
      error.code === 11000 ? 'Transaction already exists' :
      error.message || 'Failed to complete purchase';
    
    return NextResponse.json({ error: message }, { status });
  }
} 