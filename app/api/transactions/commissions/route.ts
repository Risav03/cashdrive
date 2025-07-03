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
    const status = searchParams.get('status'); // 'pending', 'paid', 'failed'

    return await dbSession.withTransaction(async () => {
      const userId = session.user.id;
      const skip = (page - 1) * limit;

      // Build commission query
      let commissionQuery: any = {};
      const affiliateMatch = await Commission.findOne({}).populate('affiliate');
      
      // Get commissions for this user
      let query: any = {
        seller: userId,
        transactionType: 'commission'
      };

      if (status) {
        query.status = status;
      }

      const [commissionTransactions, commissionRecords, totals] = await Promise.all([
        // Commission transactions where user is the recipient
        Transaction.find(query)
          .populate('listing', 'title price seller')
          .populate('buyer', 'name email')
          .populate('item', 'name type size mimeType')
          .populate({
            path: 'parentTransaction',
            populate: [
              { path: 'buyer', select: 'name email' },
              { path: 'listing', select: 'title price' }
            ]
          })
          .sort({ purchaseDate: -1 })
          .skip(skip)
          .limit(limit)
          .session(dbSession),

        // Commission records for detailed info
        Commission.find({})
          .populate({
            path: 'affiliate',
            match: { affiliateUser: userId }
          })
          .populate({
            path: 'originalTransaction',
            populate: [
              { path: 'listing', select: 'title price seller' },
              { path: 'buyer', select: 'name email' },
              { path: 'seller', select: 'name email' }
            ]
          })
          .populate('commissionTransaction', 'amount status metadata purchaseDate')
          .sort({ createdAt: -1 })
          .session(dbSession),

        // Get totals
        Transaction.aggregate([
          {
            $match: {
              seller: new mongoose.Types.ObjectId(userId),
              transactionType: 'commission'
            }
          },
          {
            $group: {
              _id: '$status',
              totalAmount: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ]).session(dbSession)
      ]);

      // Filter commission records to only include this user's commissions
      const filteredCommissionRecords = commissionRecords.filter(c => c.affiliate?.affiliateUser);

      // Calculate totals by status
      const pendingTotal = totals.find(t => t._id === 'pending')?.totalAmount || 0;
      const paidTotal = totals.find(t => t._id === 'completed')?.totalAmount || 0;
      const failedTotal = totals.find(t => t._id === 'failed')?.totalAmount || 0;

      const pendingCount = totals.find(t => t._id === 'pending')?.count || 0;
      const paidCount = totals.find(t => t._id === 'completed')?.count || 0;
      const failedCount = totals.find(t => t._id === 'failed')?.count || 0;

      return NextResponse.json({
        commissions: {
          transactions: commissionTransactions,
          records: filteredCommissionRecords,
          summary: {
            totalPending: pendingTotal,
            totalPaid: paidTotal,
            totalFailed: failedTotal,
            totalEarnings: paidTotal,
            pendingCount,
            paidCount,
            failedCount,
            totalCount: pendingCount + paidCount + failedCount
          }
        },
        pagination: {
          current: page,
          total: Math.ceil(commissionTransactions.length / limit),
          count: commissionTransactions.length
        }
      });
    });

  } catch (error: any) {
    console.error('GET /api/transactions/commissions error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  } finally {
    await dbSession.endSession();
  }
} 