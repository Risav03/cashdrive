import { authOptions } from '@/app/lib/backend/authConfig';
import { SharedLink, Transaction } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import { Affiliate } from '@/app/models/Affiliate';
import { Commission } from '@/app/models/Commission';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
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
    } else {
      // Fallback to getServerSession (for direct API calls)
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = session.user.id;
      userEmail = session.user.email || undefined;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { linkId } = await params;
    await connectDB();
    
    const sharedLink = await SharedLink.findOne({ 
      linkId, 
      isActive: true,
      type: 'monetized'
    }).populate('owner', 'name email wallet')
      .populate('item', 'name type size mimeType');
    
    if (!sharedLink) {
      return NextResponse.json({ 
        error: 'Monetized link not found or expired' 
      }, { status: 404 });
    }
    
    if (sharedLink.expiresAt && new Date() > sharedLink.expiresAt) {
      return NextResponse.json({ error: 'Link has expired' }, { status: 410 });
    }
    
    if (sharedLink.owner._id.toString() === userId) {
      return NextResponse.json({ 
        error: 'You cannot purchase your own content' 
      }, { status: 400 });
    }
    
    const hasPaid = sharedLink.paidUsers.some(
      (paidUserId: any) => paidUserId.toString() === userId
    );
    
    if (hasPaid) {
      return NextResponse.json({ 
        error: 'You have already paid for this content' 
      }, { status: 400 });
    }

    const paymentResponseHeader = request.headers.get('x-payment-response');
    const paymentResponse = parsePaymentResponse(paymentResponseHeader);
    
    console.log("Payment response from header:", paymentResponse);
    
    const transactionId = uuidv4();
    const receiptNumber = generateReceiptNumber();
    
    const transactionData: any = {
      sharedLink: sharedLink._id,
      buyer: userId,
      seller: sharedLink.owner._id,
      item: sharedLink.item._id,
      amount: sharedLink.price,
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
    
    await SharedLink.findByIdAndUpdate(sharedLink._id, {
      $addToSet: { paidUsers: userId }
    });

    // Handle affiliate commission if applicable
    let commission = null;
    if (affiliateCodeFromHeader) {
      try {
        const affiliate = await Affiliate.findOne({
          affiliateCode: affiliateCodeFromHeader,
          sharedLink: sharedLink._id,
          status: 'active'
        });

        if (affiliate && affiliate.affiliateUser.toString() !== userId) {
          const commissionAmount = (sharedLink.price * affiliate.commissionRate) / 100;
          
          commission = await Commission.create({
            affiliate: affiliate._id,
            originalTransaction: transaction._id,
            commissionRate: affiliate.commissionRate,
            commissionAmount,
            status: 'pending'
          });

          // Update affiliate stats
          await Affiliate.findByIdAndUpdate(affiliate._id, {
            $inc: { 
              totalEarnings: commissionAmount,
              totalSales: 1
            }
          });
        }
      } catch (affiliateError) {
        console.error('Error processing affiliate commission:', affiliateError);
        // Don't fail the main transaction for affiliate errors
      }
    }

    await transaction.populate('buyer', 'name email');
    await transaction.populate('seller', 'name email');
    await transaction.populate('item', 'name type size mimeType');
    
    return NextResponse.json({
      transaction,
      paymentDetails: paymentResponse,
      affiliateCommission: commission ? {
        amount: commission.commissionAmount,
        rate: commission.commissionRate
      } : null,
      message: 'Payment successful! You can now access the content.',
      sharedLink: {
        linkId: sharedLink.linkId,
        title: sharedLink.title
      }
    }, { status: 201 });
      
  } catch (error: any) {
    console.error('POST /api/shared-links/[linkId]/pay error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 