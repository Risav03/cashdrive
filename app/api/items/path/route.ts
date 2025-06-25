import { authOptions } from '@/app/lib/backend/authConfig';
import connectDB from '@/app/lib/mongodb';
import { Item } from '@/app/models/Item';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    const userSession = await getServerSession(authOptions);
    
    if (!userSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const targetItem = await Item.findOne({ 
      _id: itemId, 
      owner: userSession.user.id 
    });
    
    if (!targetItem) {
      return NextResponse.json({ error: 'Item not found or unauthorized' }, { status: 404 });
    }

    const path: any[] = [];
    let currentId = itemId;

    while (currentId) {
      const item = await Item.findOne({ 
        _id: currentId, 
        owner: userSession.user.id 
      });
      
      if (!item) break;

      path.unshift({
        id: item._id,
        name: item.name,
        type: item?.type
      });

      if (item._id.toString() === userSession.user.rootFolder?.toString()) break;
      currentId = item.parentId;
    }

    return NextResponse.json(path);

  } catch (error: any) {
    console.error('Path API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 