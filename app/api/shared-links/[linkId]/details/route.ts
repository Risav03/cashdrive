import { SharedLink } from '@/app/lib/models';
import { withErrorHandler } from '@/app/lib/utils/controllerUtils';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ linkId: string }> }
) {
  return withErrorHandler(async () => {
    const params = await context.params;
    const sharedLink = await SharedLink.findOne({ 
      linkId: params.linkId,
      isActive: true,
      type: 'monetized'
    })
      .populate('owner', 'wallet')
      .select('price title owner');

    if (!sharedLink) {
      throw new Error('Shared link not found');
    }

    return NextResponse.json({
      price: sharedLink.price,
      title: sharedLink.title,
      sellerWallet: sharedLink.owner?.wallet
    });
  });
} 