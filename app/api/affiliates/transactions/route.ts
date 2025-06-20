import { authOptions } from '@/app/lib/backend/authConfig';
import connectDB from '@/app/lib/mongodb';
import { Affiliate } from '@/app/models/Affiliate';
import { Commission } from '@/app/models/Commission';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    let query: any = {};
    
    if (type === 'earned') {
      const userAffiliates = await Affiliate.find({ affiliateUser: session.user.id }).select('_id');
      query.affiliate = { $in: userAffiliates.map(a => a._id) };
    } else if (type === 'paid') {
      const ownerAffiliates = await Affiliate.find({ owner: session.user.id }).select('_id');
      query.affiliate = { $in: ownerAffiliates.map(a => a._id) };
    } else {
      const userAffiliates = await Affiliate.find({
        $or: [
          { affiliateUser: session.user.id },
          { owner: session.user.id }
        ]
      }).select('_id');
      query.affiliate = { $in: userAffiliates.map(a => a._id) };
    }

    if (status) {
      query.status = status;
    }

    const [transactions, total] = await Promise.all([
      Commission.find(query)
        .populate({
          path: 'affiliate',
          populate: [
            { path: 'affiliateUser', select: 'name email' },
            { path: 'owner', select: 'name email' }
          ]
        })
        .populate({
          path: 'originalTransaction',
          populate: { path: 'buyer amount', select: 'name email' }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Commission.countDocuments(query)
    ]);

    // Calculate summary stats
    const [pendingStats, paidStats] = await Promise.all([
      Commission.aggregate([
        { $match: { ...query, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$commissionAmount' }, count: { $sum: 1 } } }
      ]),
      Commission.aggregate([
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