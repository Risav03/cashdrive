import { authOptions } from '@/app/lib/backend/authConfig';
import connectDB from '@/app/lib/mongodb';
import { Listing } from '@/app/models/Listing';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const params = await context.params;
    const { searchParams } = new URL(request.url);
    const incrementView = searchParams.get('incrementView') === 'true';
    
    const listing = await Listing.findById(params.id);
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    
    if (incrementView) {
      await Listing.findByIdAndUpdate(params.id, { $inc: { views: 1 } });
      return NextResponse.json({ ...listing.toObject(), views: listing.views + 1 });
    }
    
    return NextResponse.json(listing);
  } catch (error: any) {
    console.error('GET /api/listings/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await connectDB();
    
    const params = await context.params;
    const listing = await Listing.findById(params.id);
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    
    if (listing.seller._id.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const { title, description, price, status, tags } = body;
    
    if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      );
    }
    
    if (status !== undefined && !['active', 'sold', 'inactive'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be active, sold, or inactive' },
        { status: 400 }
      );
    }
    
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (status !== undefined) updateData.status = status;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
    
    const updatedListing = await Listing.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    return NextResponse.json(updatedListing);
  } catch (error: any) {
    console.error('PUT /api/listings/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await connectDB();
    
    const params = await context.params;
    const listing = await Listing.findById(params.id);
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    
    if (listing.seller._id.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await Listing.findByIdAndDelete(params.id);
    
    return NextResponse.json({ message: 'Listing deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/listings/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 