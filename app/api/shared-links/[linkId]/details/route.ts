import { SharedLink } from '@/app/lib/models';
import { withErrorHandler } from '@/app/lib/utils/controllerUtils';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/backend/authConfig';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ linkId: string }> }
) {
  return withErrorHandler(async () => {
    const params = await context.params;
    const session = await getServerSession(authOptions);

    const sharedLink = await SharedLink.findOne({ 
      linkId: params.linkId,
      isActive: true
    })
    .populate('owner', 'name wallet')
    .populate('item')
    .lean() as any; // Using any temporarily to bypass type issues

    if (!sharedLink) {
      throw new Error('Shared link not found');
    }

    // Determine access conditions
    const isOwner = session?.user?.id === sharedLink.owner?._id?.toString();
    const requiresPayment = sharedLink?.type === 'monetized';
    const requiresAuth = requiresPayment && !session;
    const alreadyPaid = false; // TODO: Check transaction history
    const canAccess = isOwner || !requiresPayment || alreadyPaid;

    // Cast the sharedLink to include all expected properties
    const link = {
      title: sharedLink.title || '',
      description: sharedLink.description || '',
      type: sharedLink?.type || 'public',
      price: sharedLink.price || 0,
      item: sharedLink.item || null,
      owner: sharedLink.owner || null,
      createdAt: sharedLink.createdAt || new Date(),
      expiresAt: sharedLink.expiresAt || null,
      accessCount: sharedLink.accessCount || 0
    };

    return NextResponse.json({
      sharedLink: {
        link,
        canAccess,
        requiresPayment,
        requiresAuth,
        alreadyPaid,
        isOwner
      }
    });
  });
} 