import { Listing } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const params = await context.params;
    const listing = await Listing.findById(params.id)
      .populate('seller', 'wallet')
      .select('price title seller');

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    return NextResponse.json({
      price: listing.price,
      title: listing.title,
      sellerWallet: listing.seller?.wallet
    });

  } catch (error: any) {
    console.error('GET /api/listings/[id]/details error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch listing details' 
    }, { status: 500 });
  }
} 