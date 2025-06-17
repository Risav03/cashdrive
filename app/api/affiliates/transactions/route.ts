import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/backend/authConfig';
import connectDB from '@/app/lib/mongodb';
import { AffiliateTransaction } from '@/app/models/AffiliateTransaction';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'earned' or 'paid'
    const status = searchParams.get('status'); // 'pending', 'paid', 'failed'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    let query: any = {};
    
    if (type === 'earned') {
      query.affiliateUser = session.user.id;
    } else if (type === 'paid') {
      query.owner = session.user.id;
    } else {
      query = {
        $or: [
          { affiliateUser: session.user.id },
          { owner: session.user.id }
        ]
      };
    }

    if (status) {
      query.status = status;
    }

    const [transactions, total] = await Promise.all([
      AffiliateTransaction.find(query)
        .populate('affiliate')
        .populate('originalTransaction')
        .populate('affiliateUser', 'name email')
        .populate('owner', 'name email')
        .populate('buyer', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AffiliateTransaction.countDocuments(query)
    ]);

    // Calculate summary stats
    const [pendingStats, paidStats] = await Promise.all([
      AffiliateTransaction.aggregate([
        { $match: { ...query, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$commissionAmount' }, count: { $sum: 1 } } }
      ]),
      AffiliateTransaction.aggregate([
        { $match: { ...query, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$commissionAmount' }, count: { $sum: 1 } } }
      ])
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: transactions.length,
        totalItems: total
      },
      summary: {
        pending: {
          amount: pendingStats[0]?.total || 0,
          count: pendingStats[0]?.count || 0
        },
        paid: {
          amount: paidStats[0]?.total || 0,
          count: paidStats[0]?.count || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching affiliate transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}