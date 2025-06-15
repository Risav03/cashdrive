import { SharedLink } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ linkId: string }> }
) {
  try {
    await connectDB();
    
    const params = await context.params;
    const sharedLink = await SharedLink.findOne({ 
      linkId: params.linkId,
      isActive: true,
      type: 'monetized'
    })
      .populate('owner', 'wallet')
      .select('price title owner');

    if (!sharedLink) {
      return NextResponse.json({ error: 'Shared link not found' }, { status: 404 });
    }

    return NextResponse.json({
      price: sharedLink.price,
      title: sharedLink.title,
      sellerWallet: sharedLink.owner?.wallet
    });

  } catch (error: any) {
    console.error('GET /api/shared-links/[linkId]/details error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch shared link details' 
    }, { status: 500 });
  }
} 