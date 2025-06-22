import { authOptions } from '@/app/lib/backend/authConfig';
import { Transaction } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const params = await context.params;
    const transaction = await Transaction.findById(params.id)
      .populate('listing', 'title price status')
      .populate('buyer', 'name email wallet')
      .populate('seller', 'name email wallet')
      .populate('item', 'name type size mimeType url');

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const isBuyer = transaction.buyer._id.toString() === session.user.id;
    const isSeller = transaction.seller._id.toString() === session.user.id;

    if (!isBuyer && !isSeller) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transactionWithType = {
      ...transaction.toObject(),
      transactionType: isBuyer ? 'purchase' : 'sale'
    };

    return NextResponse.json(transactionWithType);

  } catch (error: any) {
    console.error('GET /api/transactions/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userIdFromHeader = request.headers.get('x-user-id');
    
    if (!userIdFromHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const params = await context.params;
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { status, metadata } = body;

    // Find and update the transaction
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      {
        ...(status && { status }),
        ...(metadata && { metadata }),
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Transaction updated successfully',
      transaction: updatedTransaction
    });

  } catch (error: any) {
    console.error('PATCH /api/transactions/[id] error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to update transaction' 
    }, { status: 500 });
  }
} 