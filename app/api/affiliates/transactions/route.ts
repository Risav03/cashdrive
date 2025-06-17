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

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { transactionIds, status, markAll } = await request.json();

    if (!['paid', 'failed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be "paid" or "failed"' }, { status: 400 });
    }

    let query: any;
    
    if (markAll) {
      // Mark all pending transactions for this user as content owner
      query = {
        owner: session.user.id,
        status: 'pending'
      };
    } else if (transactionIds && Array.isArray(transactionIds)) {
      // Mark specific transactions
      query = {
        _id: { $in: transactionIds },
        owner: session.user.id, // Only allow owners to mark their affiliate transactions as paid
        status: 'pending'
      };
    } else {
      return NextResponse.json({ error: 'Either provide transactionIds array or set markAll to true' }, { status: 400 });
    }

    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (status === 'paid') {
      updateData.paidAt = new Date();
    }

    const result = await AffiliateTransaction.updateMany(query, updateData);

    return NextResponse.json({
      message: `Successfully updated ${result.modifiedCount} transactions to ${status}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error updating affiliate transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}