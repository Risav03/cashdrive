import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/backend/authConfig';
import connectDB from '@/app/lib/mongodb';
import { Affiliate } from '@/app/models/Affiliate';
import { Listing } from '@/app/models/Listing';
import { SharedLink } from '@/app/models/SharedLink';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'owned' or 'affiliate'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    let query = {};
    if (type === 'owned') {
      query = { owner: session.user.id };
    } else if (type === 'affiliate') {
      query = { affiliateUser: session.user.id };
    } else {
      query = {
        $or: [
          { owner: session.user.id },
          { affiliateUser: session.user.id }
        ]
      };
    }

    const [affiliates, total] = await Promise.all([
      Affiliate.find(query)
        .populate('owner', 'name email')
        .populate('affiliateUser', 'name email')
        .populate('listing', 'title price status')
        .populate('sharedLink', 'title price type linkId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Affiliate.countDocuments(query)
    ]);

    return NextResponse.json({
      affiliates,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: affiliates.length,
        totalItems: total
      }
    });
  } catch (error) {
    console.error('Error fetching affiliates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let { listingId, sharedLinkId, affiliateUserId, commissionRate } = await request.json();

    if (!affiliateUserId || (!listingId && !sharedLinkId)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Commission rate validation will be done after we determine the rate
    if (commissionRate !== undefined && (commissionRate < 0 || commissionRate > 100)) {
      return NextResponse.json({ error: 'Commission rate must be between 0 and 100' }, { status: 400 });
    }

    await connectDB();

    let contentItem = null;
    let isOwnerCreatingAffiliate = false;
    let isUserBecomingAffiliate = false;
    
    if (listingId) {
      contentItem = await Listing.findById(listingId);
      if (!contentItem) {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      }
      
      // Check if affiliate programs are enabled for this listing
      if (!contentItem.affiliateEnabled) {
        return NextResponse.json({ error: 'Affiliate program not enabled for this listing' }, { status: 400 });
      }
      
      isOwnerCreatingAffiliate = contentItem.seller.toString() === session.user.id;
      isUserBecomingAffiliate = affiliateUserId === session.user.id;
      
      // Either the owner is creating an affiliate OR the user is becoming an affiliate
      if (!isOwnerCreatingAffiliate && !isUserBecomingAffiliate) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      
      // If user is becoming affiliate, use the default commission rate from the listing
      if (isUserBecomingAffiliate) {
        commissionRate = contentItem.defaultCommissionRate || 10;
      }
    } else if (sharedLinkId) {
      contentItem = await SharedLink.findById(sharedLinkId);
      if (!contentItem) {
        return NextResponse.json({ error: 'Shared link not found' }, { status: 404 });
      }
      
      isOwnerCreatingAffiliate = contentItem.owner.toString() === session.user.id;
      isUserBecomingAffiliate = affiliateUserId === session.user.id;
      
      // Either the owner is creating an affiliate OR the user is becoming an affiliate
      if (!isOwnerCreatingAffiliate && !isUserBecomingAffiliate) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      
      // If user is becoming affiliate, use a default commission rate of 10%
      if (isUserBecomingAffiliate) {
        commissionRate = 10; // Default for shared links
      }
    }

    // Final validation of commission rate
    if (commissionRate < 0 || commissionRate > 100) {
      return NextResponse.json({ error: 'Commission rate must be between 0 and 100' }, { status: 400 });
    }

    // Determine the correct owner based on who is creating the affiliate
    const ownerId = isUserBecomingAffiliate 
      ? (listingId ? contentItem.seller : contentItem.owner) 
      : session.user.id;

    // Check if affiliate already exists
    const existingAffiliate = await Affiliate.findOne({
      ...(listingId && { listing: listingId }),
      ...(sharedLinkId && { sharedLink: sharedLinkId }),
      owner: ownerId,
      affiliateUser: affiliateUserId
    });

    if (existingAffiliate) {
      return NextResponse.json({ error: 'Affiliate already exists for this content' }, { status: 409 });
    }

    // Generate unique affiliate code
    let affiliateCode;
    let isUnique = false;
    while (!isUnique) {
      affiliateCode = nanoid(8);
      const existing = await Affiliate.findOne({ affiliateCode });
      if (!existing) isUnique = true;
    }

    const affiliate = new Affiliate({
      ...(listingId && { listing: listingId }),
      ...(sharedLinkId && { sharedLink: sharedLinkId }),
      owner: ownerId,
      affiliateUser: affiliateUserId,
      commissionRate,
      affiliateCode,
      status: 'active'
    });

    await affiliate.save();
    await affiliate.populate([
      { path: 'owner', select: 'name email' },
      { path: 'affiliateUser', select: 'name email' },
      { path: 'listing', select: 'title price status' },
      { path: 'sharedLink', select: 'title price type linkId' }
    ]);

    return NextResponse.json({ affiliate }, { status: 201 });
  } catch (error) {
    console.error('Error creating affiliate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}