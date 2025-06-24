import { Listing } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import {
  validateMonetizedContent,
  withAuthCheck,
  withErrorHandler,
  withTransaction
} from '@/app/lib/utils/controllerUtils';
import { Types } from 'mongoose';
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
  await connectDB()

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
  return withErrorHandler(async () => {
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
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const userId = await withAuthCheck(request);
    const params = await context.params;
    const body = await request.json();
    const { title, description, price, status, tags } = body as ListingUpdateData;
    
    if (price !== undefined) {
      validateMonetizedContent({
        type: 'monetized',
        price,
        paidUsers: []
      });
    }
    
    if (status !== undefined && !validateStatus(status)) {
      throw new Error('Invalid status. Must be active or inactive');
    }
    
    return await withTransaction(async (session) => {
      await getListingWithAuth(params.id, userId, true);
      
      const updateData: ListingUpdateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = price;
      if (status !== undefined) updateData.status = status;
      if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
      
      const updatedListing = await Listing.findOneAndUpdate(
        { _id: params.id },
        updateData,
        { new: true, session }
      )
        .populate('item', 'name type size mimeType url')
        .populate('seller', 'name wallet')
        .lean<ListingDocument>();
      
      return NextResponse.json(updatedListing);
    });
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const userId = await withAuthCheck(request);
    const params = await context.params;
    
    return await withTransaction(async (session) => {
      await getListingWithAuth(params.id, userId, true);
      await Listing.findOneAndDelete({ _id: params.id }).session(session);
      return NextResponse.json({ message: 'Listing deleted successfully' });
    });
  });
} 