import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import { Affiliate } from '@/app/models/Affiliate';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await connectDB();

    const { code } = await params;
    const affiliate = await Affiliate.findOne({ 
      affiliateCode: code,
      status: 'active'
    })
      .populate('owner')
      .populate('affiliateUser')
      .populate('listing', 'title price status description')
      .populate('sharedLink', 'title price type description');

    if (!affiliate) {
      return NextResponse.json({ error: 'Affiliate code not found or inactive' }, { status: 404 });
    }

    // Return affiliate info for tracking purchases
    return NextResponse.json({ 
      affiliate: {
        _id: affiliate._id,
        commissionRate: affiliate.commissionRate,
        affiliateUser: affiliate.affiliateUser,
        owner: affiliate.owner,
        content: affiliate.listing || affiliate.sharedLink,
        contentType: affiliate.listing ? 'listing' : 'sharedLink'
      }
    });
  } catch (error) {
    console.error('Error fetching affiliate by code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}