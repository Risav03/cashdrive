import { authOptions } from '@/app/lib/backend/authConfig';
import { SharedLink, Transaction } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Generate unique receipt number
function generateReceiptNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RCP-${timestamp}-${random}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
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
    
    const userId = session.user.id;
    
    // Check if user is trying to buy their own content
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
    
    // TODO: Implement x402 payment processing
    // This is where you would integrate with your payment system
    // For now, we'll simulate a successful payment
    
    try {
      // TODO: Replace this with actual x402 payment logic
      console.log(`Processing payment of $${sharedLink.price} for link ${linkId} by user ${userId}`);
      
      // Simulate payment processing
      const paymentSuccessful = true; // This would come from your payment processor
      
      if (!paymentSuccessful) {
        return NextResponse.json({ 
          error: 'Payment failed. Please try again.' 
        }, { status: 402 });
      }
      
      // Generate transaction details
      const transactionId = uuidv4();
      const receiptNumber = generateReceiptNumber();
      
      // Create transaction record
      const transaction = await Transaction.create({
        listing: null, // No listing for shared links
        buyer: userId,
        seller: sharedLink.owner._id,
        item: sharedLink.item._id,
        amount: sharedLink.price,
        status: 'completed',
        transactionId,
        receiptNumber,
        purchaseDate: new Date(),
        // Add metadata to identify this as a shared link transaction
        metadata: {
          type: 'shared_link',
          linkId: linkId,
          sharedLinkId: sharedLink._id
        }
      });
      
      // Add user to paid users list
      await SharedLink.findByIdAndUpdate(sharedLink._id, {
        $addToSet: { paidUsers: userId }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Payment successful! You can now access the content.',
        amount: sharedLink.price,
        transaction: {
          id: transaction._id,
          receiptNumber: transaction.receiptNumber,
          amount: transaction.amount
        }
      });
      
    } catch (paymentError: any) {
      console.error('Payment processing error:', paymentError);
      return NextResponse.json({ 
        error: 'Payment processing failed. Please try again.' 
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('POST /api/shared-links/[linkId]/pay error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 