import { authOptions } from '@/app/lib/backend/authConfig';
import { Item, Listing } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const sellerId = searchParams.get('sellerId');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search');
    const tagsParam = searchParams.get('tags');
    const tags = tagsParam ? tagsParam.split(',').map(tag => tag.trim()) : [];
    
    const query: any = { status };
    if (sellerId) {
      query.seller = sellerId;
    }
    
    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i'); // Case-insensitive search
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } }
      ];
    }
    
    // Add tag filtering
    if (tags.length > 0) {
      // If both search and tag filters are present, combine them with AND logic
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { tags: { $in: tags } }
        ];
        delete query.$or;
      } else {
        query.tags = { $in: tags };
      }
    }
    
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;
    const [listings, total] = await Promise.all([
      Listing.find(query)
        .populate('item', 'name type size mimeType url')
        .populate('seller', 'name wallet')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Listing.countDocuments(query)
    ]);
    
    return NextResponse.json({
      listings,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: listings.length,
        totalItems: total
      }
    });
  } catch (error: any) {
    console.error('GET /api/listings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await connectDB();
    
    const body = await request.json();
    const { itemId, title, description, price, tags } = body;
    
    if (!itemId || !title || !description || !price) {
      return NextResponse.json(
        { error: 'Item ID, title, description, and price are required' },
        { status: 400 }
      );
    }
    
    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      );
    }
    
    const item = await Item.findOne({ _id: itemId, owner: session.user.id });
    if (!item) {
      return NextResponse.json({ 
        error: 'Item not found or you do not have permission to list it' 
      }, { status: 404 });
    }
    
    const existingListing = await Listing.findOne({ 
      item: itemId, 
      status: 'active'
    });
    if (existingListing) {
      return NextResponse.json(
        { error: 'Item is already listed' },
        { status: 400 }
      );
    }
    
    const listing = await Listing.create({
      item: itemId,
      seller: session.user.id,
      title,
      description,
      price,
      tags: Array.isArray(tags) ? tags : []
    });
    
    await listing.populate('item', 'name type size mimeType url');
    await listing.populate('seller', 'name wallet');
    
    return NextResponse.json(listing, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/listings error:', error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Item is already listed' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 