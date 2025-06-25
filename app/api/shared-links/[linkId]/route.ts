import {
  createAccessResponse,
  withAuthCheck,
  withErrorHandler,
  withTransaction
} from '@/app/lib/utils/controllerUtils';
import { copyItemToUserDrive } from '@/app/lib/utils/itemUtils';
import { SharedLink } from '@/app/models/SharedLink';
import { NextRequest, NextResponse } from 'next/server';

async function getAndValidateLink(linkId: string, session?: any) {
  const sharedLink = await SharedLink.findOne({ linkId, isActive: true })
    .populate('item', 'name type size mimeType url')
    .populate('owner', 'name email wallet');
  
  if (!sharedLink) {
    throw new Error('Link not found or expired');
  }
  
  if (sharedLink.expiresAt && new Date() > sharedLink.expiresAt) {
    throw new Error('Link has expired');
  }

  if (!['public', 'monetized'].includes(sharedLink?.type)) {
    throw new Error('Invalid link type');
  }
  
  return sharedLink;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  return withErrorHandler(async () => {
    const { linkId } = await params;
    const sharedLink = await getAndValidateLink(linkId);
    
    await SharedLink.findByIdAndUpdate(sharedLink._id, { $inc: { accessCount: 1 } });
    
    let userId;
    try {
      userId = await withAuthCheck(request);
    } catch (error) {
    }
    
    return NextResponse.json(
      createAccessResponse(sharedLink, sharedLink?.type === 'monetized', userId)
    );
  }, {
    'expired': 410,
    'not found or expired': 404,
    'Invalid link type': 400
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  return withErrorHandler(async () => {
    const userId = await withAuthCheck(request);
    const { linkId } = await params;
    
    return await withTransaction(async (session) => {
      const sharedLink = await getAndValidateLink(linkId);
      
      if (sharedLink?.type === 'monetized' && 
          !sharedLink.paidUsers.some((paidUserId: any) => paidUserId.toString() === userId)) {
        throw new Error('Payment required to access this content');
      }
      
      const copiedItem = await copyItemToUserDrive(userId, sharedLink.item);
      
      return NextResponse.json({
        success: true,
        message: `${sharedLink.item.name} has been added to your drive in the 'shared' folder`,
        copiedItem
      });
    });
  }, {
    'expired': 410,
    'not found or expired': 404,
    'Payment required': 402
  });
} 