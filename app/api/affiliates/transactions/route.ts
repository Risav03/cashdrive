import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/backend/authConfig';
import connectDB from '@/app/lib/mongodb';
import { Commission } from '@/app/models/Commission';
import { Transaction } from '@/app/models/Transaction';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  const dbSession = await mongoose.startSession();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'earned'; // 'earned' or 'paid'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    return await dbSession.withTransaction(async () => {
      // Query for commissions where user is either the affiliate (earned) or the content owner (paid)
      let query = type === 'earned' 
        ? { 'affiliate.affiliateUser': session.user.id }
        : { 'originalTransaction.seller': session.user.id };

      const [commissions, totals] = await Promise.all([
        Commission.find()
          .populate({
            path: 'affiliate',
            match: type === 'earned' ? { affiliateUser: session.user.id } : {},
            populate: { path: 'affiliateUser', select: 'name email' }
          })
          .populate({
            path: 'originalTransaction',
            match: type === 'paid' ? { seller: session.user.id } : {},
            populate: [
              { path: 'buyer', select: 'name email' },
              { path: 'seller', select: 'name email' }
            ]
          })
          .populate('commissionTransaction', 'amount status metadata purchaseDate')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .session(dbSession),

        Commission.aggregate([
          {
            $lookup: {
              from: 'affiliates',
              localField: 'affiliate',
              foreignField: '_id',
              as: 'affiliate'
            }
          },
          {
            $lookup: {
              from: 'transactions',
              localField: 'originalTransaction',
              foreignField: '_id',
              as: 'originalTransaction'
            }
          },
          {
            $match: type === 'earned'
              ? { 'affiliate.affiliateUser': new mongoose.Types.ObjectId(session.user.id) }
              : { 'originalTransaction.seller': new mongoose.Types.ObjectId(session.user.id) }
          },
          {
            $group: {
              _id: '$status',
              amount: { $sum: '$commissionAmount' },
              count: { $sum: 1 }
            }
          }
        ]).session(dbSession)
      ]);

      // Filter out commissions where the affiliate or original transaction doesn't match the query
      const filteredCommissions = commissions.filter(c => 
        type === 'earned' ? c.affiliate?.affiliateUser : c.originalTransaction?.seller
      );

      // Calculate totals by status
      const summary = {
        pending: { amount: 0, count: 0 },
        paid: { amount: 0, count: 0 },
        failed: { amount: 0, count: 0 }
      };

      totals.forEach(total => {
        const status = total._id as keyof typeof summary;
        if (summary[status]) {
          summary[status].amount = total.amount;
          summary[status].count = total.count;
        }
      });

      return NextResponse.json({
        transactions: filteredCommissions,
        summary,
        pagination: {
          current: page,
          total: Math.ceil(filteredCommissions.length / limit),
          count: filteredCommissions.length
        }
      });
    });

  } catch (error) {
    console.error('Error fetching affiliate transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await dbSession.endSession();
  }
} 