import { authOptions } from '@/app/lib/backend/authConfig';
import { Transaction } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
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
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const status = searchParams.get('status'); 

    return await dbSession.withTransaction(async () => {
      let query: any = {};
      
      if (type === 'purchases') {
        query.buyer = session.user.id;
      } else if (type === 'sales') {
        query.seller = session.user.id;
      } else {
        query.$or = [
          { buyer: session.user.id },
          { seller: session.user.id }
        ];
      }

      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;
      
      const [transactions, total] = await Promise.all([
        Transaction.find(query)
          .populate('listing', 'title price status')
          .populate('buyer', 'name email wallet')
          .populate('seller', 'name email wallet')
          .populate('item', 'name type size mimeType url')
          .sort({ purchaseDate: -1 })
          .skip(skip)
          .limit(limit)
          .session(dbSession),
        Transaction.countDocuments(query).session(dbSession)
      ]);
      
      const transactionsWithType = transactions.map(transaction => ({
        ...transaction.toObject(),
        transactionType: transaction.buyer._id.toString() === session.user.id ? 'purchase' : 'sale'
      }));

      return NextResponse.json({
        transactions: transactionsWithType,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: transactions.length,
          totalItems: total
        }
      });
    });

  } catch (error: any) {
    console.error('GET /api/transactions error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  } finally {
    await dbSession.endSession();
  }
} 