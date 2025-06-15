import { authOptions } from '@/app/lib/backend/authConfig';
import { SharedLink, Transaction } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

function generateReceiptNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RCP-${timestamp}-${random}`;
}

function parsePaymentResponse(paymentResponseHeader: string | null) {
  if (!paymentResponseHeader) {
    return null;
  }
  
  try {
    return JSON.parse(paymentResponseHeader);
  } catch (error) {
    console.error('Error parsing x-payment-response:', error);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    // First try to get session from headers (for server actions)
    const userIdFromHeader = request.headers.get('x-user-id');
    const userEmailFromHeader = request.headers.get('x-user-email');
    
    let userId: string | undefined;
    let userEmail: string | undefined;

    if (userIdFromHeader && userEmailFromHeader) {
      // Use headers if available (from server action)
      userId = userIdFromHeader;
      userEmail = userEmailFromHeader;
      console.log('Using session from headers:', { userId, userEmail });
    } else {
      // Fallback to getServerSession (for direct API calls)
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = session.user.id;
      userEmail = session.user.email || undefined;
    }

    if (!userId) {
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

    // Extract payment details from x-payment-response header
    const paymentResponseHeader = request.headers.get('x-payment-response');
    const paymentResponse = parsePaymentResponse(paymentResponseHeader);
    
    console.log("Payment response from header:", paymentResponse);
    
    // Generate transaction details
    const transactionId = uuidv4();
    const receiptNumber = generateReceiptNumber();
    
    // Create transaction with payment details
    const transactionData: any = {
      listing: null, // No listing for shared links
      buyer: userId,
      seller: sharedLink.owner._id,
      item: sharedLink.item._id,
      amount: sharedLink.price,
      status: 'completed',
      transactionId,
      receiptNumber,
      purchaseDate: new Date(),
      metadata: {
        type: 'shared_link',
        linkId: linkId,
        sharedLinkId: sharedLink._id,
        sharedLinkTitle: sharedLink.title
      }
    };

    // Add blockchain transaction details if available
    if (paymentResponse) {
      transactionData.metadata = {
        ...transactionData.metadata,
        blockchainTransaction: paymentResponse.transaction,
        network: paymentResponse.network,
        payer: paymentResponse.payer,
        success: paymentResponse.success,
        paymentResponseRaw: paymentResponseHeader
      };
    }

    const transaction = await Transaction.create(transactionData);
    
    // Add user to paid users list
    await SharedLink.findByIdAndUpdate(sharedLink._id, {
      $addToSet: { paidUsers: userId }
    });

    await transaction.populate('buyer', 'name email');
    await transaction.populate('seller', 'name email');
    await transaction.populate('item', 'name type size mimeType');
    
    return NextResponse.json({
      transaction,
      paymentDetails: paymentResponse,
      message: 'Payment successful! You can now access the content.',
      sharedLink: {
        linkId: sharedLink.linkId,
        title: sharedLink.title
      }
    }, { status: 201 });
      
  } catch (error: any) {
    console.error('POST /api/shared-links/[linkId]/pay error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 