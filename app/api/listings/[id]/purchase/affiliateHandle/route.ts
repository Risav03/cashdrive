import { NextRequest, NextResponse } from 'next/server';
import { Affiliate } from '@/app/models/Affiliate';
import { AffiliateTransaction } from '@/app/models/AffiliateTransaction';
import connectDB from '@/app/lib/mongodb';
import { Transaction } from '@/app/lib/models';

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
    const listingId = params.id;

    // Get transaction details from request body
    const body = await request.json();
    const { transactionId, saleAmount } = body;

    if (!transactionId || !saleAmount) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Find the original transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return NextResponse.json({ 
        error: 'Transaction not found' 
      }, { status: 404 });
    }

    let affiliateTransaction = null;
    if (affiliateCodeFromHeader) {
      const affiliate = await Affiliate.findOne({
        affiliateCode: affiliateCodeFromHeader,
        listing: listingId,
        status: 'active'
      });

      if (affiliate && affiliate.affiliateUser.toString() !== userIdFromHeader) {
        const commissionAmount = (saleAmount * affiliate.commissionRate) / 100;
        
        affiliateTransaction = await AffiliateTransaction.create({
          affiliate: affiliate._id,
          originalTransaction: transaction._id,
          affiliateUser: affiliate.affiliateUser,
          owner: affiliate.owner,
          buyer: userIdFromHeader,
          saleAmount: saleAmount,
          commissionRate: affiliate.commissionRate,
          commissionAmount,
          affiliateCode: affiliateCodeFromHeader,
          status: 'paid'
        });

        // Update affiliate stats
        await Affiliate.findByIdAndUpdate(affiliate._id, {
          $inc: { 
            totalEarnings: commissionAmount,
            totalSales: 1
          }
        });

        return NextResponse.json({
          success: true,
          affiliateTransaction: {
            _id: affiliateTransaction._id,
            commissionAmount: affiliateTransaction.commissionAmount,
            commissionRate: affiliateTransaction.commissionRate,
            status: affiliateTransaction.status
          }
        }, { status: 201 });
      }
    }

    return NextResponse.json({
      success: false,
      message: 'No valid affiliate found for this transaction'
    }, { status: 200 });

  } catch (error: any) {
    console.error('POST /api/listings/[id]/purchase/affiliateHandle error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process affiliate transaction' 
    }, { status: 500 });
  }
}