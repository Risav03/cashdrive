import { authOptions } from '@/app/lib/backend/authConfig';
import { Listing } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import { Types } from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

interface ListingDocument {
  _id: Types.ObjectId;
  seller: {
    _id: Types.ObjectId;
    name: string;
    wallet: string;
  };
  item: {
    name: string;
    type: string;
    size: number;
    mimeType: string;
    url: string;
  };
  views: number;
}

type ListingUpdateData = {
  title?: string;
  description?: string;
  price?: number;
  status?: 'active' | 'inactive';
  tags?: string[];
};

const isValidObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

const validatePrice = (price: number): boolean => {
  return typeof price === 'number' && price > 0;
};

const validateStatus = (status: string): status is 'active' | 'inactive' => {
  return ['active', 'inactive'].includes(status);
};

async function getListingWithAuth(
  listingId: string,
  userId?: string,
  requireAuth = false
): Promise<ListingDocument> {
  if (!isValidObjectId(listingId)) {
    throw new Error('Invalid listing ID format');
  }

  const listing = await Listing.findById(listingId)
    .populate('item', 'name type size mimeType url')
    .populate('seller', 'name wallet')
    .lean<ListingDocument>();

  if (!listing) {
    throw new Error('Listing not found');
  }

  if (requireAuth) {
    if (!userId) {
      throw new Error('Unauthorized');
    }
    if (listing.seller._id.toString() !== userId) {
      throw new Error('Forbidden');
    }
  }

  return listing;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const params = await context.params;
    const { searchParams } = new URL(request.url);
    const incrementView = searchParams.get('incrementView') === 'true';
    
    const listing = await getListingWithAuth(params.id);
    
    if (incrementView) {
      const updatedListing = await Listing.findOneAndUpdate(
        { _id: params.id },
        { $inc: { views: 1 } },
        { new: true }
      ).lean<ListingDocument>();
      
      return NextResponse.json({
        ...listing,
        views: (updatedListing?.views ?? listing.views + 1)
      });
    }
    
    return NextResponse.json(listing);
  } catch (error: any) {
    console.error('GET /api/listings/[id] error:', error);
    const status = 
      error.message === 'Invalid listing ID format' ? 400 :
      error.message === 'Listing not found' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    await connectDB();
    
    const params = await context.params;
    const body = await request.json();
    const { title, description, price, status, tags } = body as ListingUpdateData;
    
    if (price !== undefined && !validatePrice(price)) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      );
    }
    
    if (status !== undefined && !validateStatus(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be active or inactive' },
        { status: 400 }
      );
    }
    
    await getListingWithAuth(params.id, session?.user?.id, true);
    
    const updateData: ListingUpdateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (status !== undefined) updateData.status = status;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
    
    const updatedListing = await Listing.findOneAndUpdate(
      { _id: params.id },
      updateData,
      { new: true }
    )
      .populate('item', 'name type size mimeType url')
      .populate('seller', 'name wallet')
      .lean<ListingDocument>();
    
    return NextResponse.json(updatedListing);
  } catch (error: any) {
    console.error('PATCH /api/listings/[id] error:', error);
    const status = 
      error.message === 'Invalid listing ID format' ? 400 :
      error.message === 'Listing not found' ? 404 :
      error.message === 'Unauthorized' ? 401 :
      error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    await connectDB();
    
    const params = await context.params;
    
    await getListingWithAuth(params.id, session?.user?.id, true);
    
    await Listing.findOneAndDelete({ _id: params.id });
    
    return NextResponse.json({ message: 'Listing deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/listings/[id] error:', error);
    const status = 
      error.message === 'Invalid listing ID format' ? 400 :
      error.message === 'Listing not found' ? 404 :
      error.message === 'Unauthorized' ? 401 :
      error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
} 