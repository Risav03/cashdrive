import { authOptions } from '@/app/lib/backend/authConfig';
import connectDB from '@/app/lib/mongodb';
import { Item } from '@/app/models/Item';
import SharedLink from '@/app/models/SharedLink';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

function generateLinkId(): string {
  return uuidv4().replace(/-/g, '').substring(0, 16);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const query: any = { 
      owner: session.user.id,
      isActive: true
    };
    
    if (type && ['public', 'monetized'].includes(type)) {
      query.type = type;
    }
    
    const skip = (page - 1) * limit;
    const [links, total] = await Promise.all([
      SharedLink.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SharedLink.countDocuments(query)
    ]);
    
    return NextResponse.json({
      links,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: links.length,
        totalItems: total
      }
    });
  } catch (error: any) {
    console.error('GET /api/shared-links error:', error);
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
    const { itemId, type, price, title, description, expiresAt } = body;
    
    if (!itemId || !type || !title) {
      return NextResponse.json(
        { error: 'Item ID, type, and title are required' },
        { status: 400 }
      );
    }
    
    if (!['public', 'monetized'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either "public" or "monetized"' },
        { status: 400 }
      );
    }
    
    if (type === 'monetized' && (!price || typeof price !== 'number' || price <= 0)) {
      return NextResponse.json(
        { error: 'Price is required for monetized links and must be greater than 0' },
        { status: 400 }
      );
    }
    
    const item = await Item.findOne({ _id: itemId, owner: session.user.id });
    if (!item) {
      return NextResponse.json({ 
        error: 'Item not found or you do not have permission to share it' 
      }, { status: 404 });
    }
    
    const linkData: any = {
      item: itemId,
      owner: session.user.id,
      linkId: generateLinkId(),
      type,
      title,
      description,
      paidUsers: []
    };
    
    if (type === 'monetized') {
      linkData.price = price;
    }
    
    if (expiresAt) {
      linkData.expiresAt = new Date(expiresAt);
    }
    
    const sharedLink = await SharedLink.create(linkData);
    await sharedLink.populate('item', 'name type size mimeType url');
    await sharedLink.populate('owner', 'name email wallet');
    
    return NextResponse.json(sharedLink, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/shared-links error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 