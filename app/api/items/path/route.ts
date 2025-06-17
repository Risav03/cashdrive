import { authOptions } from '@/app/lib/backend/authConfig';
import connectDB from '@/app/lib/mongodb';
import { Item } from '@/app/models/Item';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const session = await mongoose.startSession();
  
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

    return await session.withTransaction(async () => {
      const targetItem = await Item.findOne({ 
        _id: itemId, 
        owner: userSession.user.id 
      }).session(session);
      
      if (!targetItem) {
        throw new Error('Item not found or unauthorized');
      }

      const path: any[] = [];
      let currentId = itemId;

      while (currentId) {
        const item = await Item.findOne({ 
          _id: currentId, 
          owner: userSession.user.id 
        }).session(session);
        
        if (!item) break;

        path.unshift({
          id: item._id,
          name: item.name,
          type: item.type
        });

        if (item._id.toString() === userSession.user.rootFolder?.toString()) break;
        currentId = item.parentId;
      }

      return NextResponse.json(path);
    });

  } catch (error: any) {
    console.error('Path API error:', error);
    
    if (error.message === 'Unauthorized' || error.message === 'Item not found or unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  } finally {
    await session.endSession();
  }
} 