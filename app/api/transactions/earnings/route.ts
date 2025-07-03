import { authOptions } from '@/app/lib/backend/authConfig';
import { Transaction } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import { Commission } from '@/app/models/Commission';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const dbSession = await mongoose.startSession();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    return await dbSession.withTransaction(async () => {
      const userId = session.user.id;
      const skip = (page - 1) * limit;

      // Get all transactions where user is the seller (original listings they own)
      const [mainTransactions, affiliateTransactions, commissions, totals] = await Promise.all([
        // Main purchase transactions for listings they own
        Transaction.find({
          seller: userId,
          transactionType: 'purchase'
        })
          .populate('listing', 'title price status')
          .populate('buyer', 'name email')
          .populate('item', 'name type size mimeType')
          .sort({ purchaseDate: -1 })
          .skip(skip)
          .limit(limit)
          .session(dbSession),

        // Commission transactions (where they receive commission as affiliate)
        Transaction.find({
          seller: userId,
          transactionType: 'commission'
        })
          .populate('listing', 'title price seller')
          .populate('buyer', 'name email')
          .populate('item', 'name type size mimeType')
          .populate('parentTransaction', 'transactionId buyer')
          .sort({ purchaseDate: -1 })
          .session(dbSession),

        // Commission records for listings they own (where others get commission)
        Commission.find({})
          .populate({
            path: 'originalTransaction',
            match: { seller: userId },
            populate: [
              { path: 'listing', select: 'title price' },
              { path: 'buyer', select: 'name email' }
            ]
          })
          .populate('affiliate', 'affiliateCode affiliateUser')
          .populate('commissionTransaction', 'amount status metadata')
          .session(dbSession),

        // Get summary totals
        Transaction.aggregate([
          {
            $match: {
              $or: [
                { seller: new mongoose.Types.ObjectId(userId), transactionType: 'purchase' },
                { seller: new mongoose.Types.ObjectId(userId), transactionType: 'commission' }
              ]
            }
          },
          {
            $group: {
              _id: '$transactionType',
              totalAmount: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ]).session(dbSession)
      ]);

      // Filter out commissions where the original transaction doesn't belong to this user
      const filteredCommissions = commissions.filter(c => c.originalTransaction?.seller);

      // Calculate totals
      const salesTotal = totals.find(t => t._id === 'purchase')?.totalAmount || 0;
      const commissionTotal = totals.find(t => t._id === 'commission')?.totalAmount || 0;
      const salesCount = totals.find(t => t._id === 'purchase')?.count || 0;
      const commissionCount = totals.find(t => t._id === 'commission')?.count || 0;

      return NextResponse.json({
        earnings: {
          sales: {
            transactions: mainTransactions,
            total: salesTotal,
            count: salesCount
          },
          commissions: {
            transactions: affiliateTransactions,
            total: commissionTotal,
            count: commissionCount
          },
          affiliateActivity: filteredCommissions,
          summary: {
            totalEarnings: salesTotal + commissionTotal,
            totalSales: salesCount,
            totalCommissions: commissionCount,
            totalAffiliateCommissionsPaid: filteredCommissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0)
          }
        },
        pagination: {
          current: page,
          total: Math.ceil(mainTransactions.length / limit),
          count: mainTransactions.length
        }
      });
    });

  } catch (error: any) {
    console.error('GET /api/transactions/earnings error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  } finally {
    await dbSession.endSession();
  }
} 