import {
  handlePaginatedRequest,
  validateMonetizedContent,
  withAuthCheck,
  withErrorHandler,
  withTransaction
} from '@/app/lib/utils/controllerUtils';
import { Item } from '@/app/models/Item';
import { SharedLink } from '@/app/models/SharedLink';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

function generateLinkId(): string {
  return uuidv4().replace(/-/g, '').substring(0, 16);
}

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const userId = await withAuthCheck(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    const query: any = { 
      owner: userId,
      isActive: true
    };
    
    if (type && ['public', 'monetized'].includes(type)) {
      query.type = type;
    }
    
    const { items: links, pagination } = await handlePaginatedRequest(
      query,
      SharedLink,
      {
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '20'),
        populate: [
          { path: 'item', select: 'name type size mimeType url' },
          { path: 'owner', select: 'name email wallet' }
        ],
        sort: { createdAt: -1 }
      }
    );
    
    return NextResponse.json({ links, pagination });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const userId = await withAuthCheck(request);
    const { itemId, type, price, title, description, expiresAt } = await request.json();
    
    if (!itemId || !type || !title) {
      throw new Error('Item ID, type, and title are required');
    }
    
    validateMonetizedContent({
      type,
      price,
      paidUsers: []
    });

    return await withTransaction(async (session) => {
      // Verify the item exists and belongs to the user
      const item = await Item.findOne({ 
        _id: itemId, 
        owner: userId 
      }).session(session);
      
      if (!item) {
        throw new Error('Item not found or you do not have permission to share it');
      }
      
      // Check for existing active shared link for this item
      const existingLink = await SharedLink.findOne({
        item: itemId,
        owner: userId,
        isActive: true
      }).session(session);
      
      if (existingLink) {
        throw new Error('An active shared link already exists for this item');
      }
      
      const linkData = {
        item: itemId,
        owner: userId,
        linkId: generateLinkId(),
        type,
        title,
        description,
        paidUsers: [],
        ...(type === 'monetized' && { price }),
        ...(expiresAt && { expiresAt: new Date(expiresAt) })
      };
      
      const [sharedLink] = await SharedLink.create([linkData], { session });
      await sharedLink.populate('item', 'name type size mimeType url');
      await sharedLink.populate('owner', 'name email wallet');
      
      return NextResponse.json(sharedLink, { status: 201 });
    });
  });
} 