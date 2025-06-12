import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import { Item } from '@/app/models/Item';
import { getUserRootFolder } from '@/app/lib/backend/helperFunctions/getUserRootFolder';

// Get path from root to item
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    
    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const rootFolder = await getUserRootFolder();
    await connectDB();

    const path: any[] = [];
    let currentId = itemId;

    while (currentId) {
      const item = await Item.findById(currentId);
      if (!item) break;

      path.unshift({
        id: item._id,
        name: item.name,
        type: item.type
      });

      if (item._id.toString() === rootFolder.toString()) break;
      currentId = item.parentId;
    }

    return NextResponse.json(path);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 