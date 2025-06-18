import { Item, Listing } from '@/app/lib/models';
import {
  handlePaginatedRequest,
  validateMonetizedContent,
  withAuthCheck,
  withErrorHandler,
  withTransaction
} from '@/app/lib/utils/controllerUtils';
import { SortOrder } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const sellerId = searchParams.get('sellerId');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search')?.trim();
    const tagsParam = searchParams.get('tags');
    const tags = tagsParam ? tagsParam.split(',').map(tag => tag.trim()) : [];
    
    const query: any = { status };
    if (sellerId) query.seller = sellerId;
    
    const conditions = [];
    
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      conditions.push({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tags: { $in: [searchRegex] } }
        ]
      });
    }
    
    if (tags.length > 0) {
      conditions.push({ tags: { $in: tags } });
    }
    
    if (conditions.length > 0) {
      query.$and = conditions;
    }
    
    const sort: { [key: string]: SortOrder } = { 
      [sortBy]: sortOrder === 'desc' ? -1 : 1 
    };

    const { items: listings, pagination } = await handlePaginatedRequest(
      query,
      Listing,
      {
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '20'),
        populate: [
          { path: 'item', select: 'name type size mimeType url' },
          { path: 'seller', select: 'name wallet' }
        ],
        sort
      }
    );
    
    return NextResponse.json({ listings, pagination });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const userId = await withAuthCheck(request);
    
    const body = await request.json();
    const { itemId, title, description, price, tags, affiliateEnabled } = body;
    
    if (!itemId || !title || !description || !price) {
      throw new Error('Item ID, title, description, and price are required');
    }
    
    validateMonetizedContent({
      type: 'monetized',
      price,
      paidUsers: []
    });
    
    return await withTransaction(async (session) => {
      const [item, existingListing] = await Promise.all([
        Item.findOne({ _id: itemId, owner: userId }).session(session),
        Listing.findOne({ item: itemId, status: 'active' }).session(session)
      ]);

      if (!item) {
        throw new Error('Item not found or you do not have permission to list it');
      }
      
      if (existingListing) {
        throw new Error('Item is already listed');
      }
      
      const listing = await Listing.create([{
        item: itemId,
        seller: userId,
        title,
        description,
        price,
        tags: Array.isArray(tags) ? tags : [],
        affiliateEnabled: affiliateEnabled || false
      }], { session });
      
      await Promise.all([
        listing[0].populate({ path: 'item', select: 'name type size mimeType url', options: { session } }),
        listing[0].populate({ path: 'seller', select: 'name wallet', options: { session } })
      ]);
      
      return NextResponse.json(listing[0], { status: 201 });
    });
  });
} 