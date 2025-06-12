import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import { Item } from '@/app/models/Item';
import { getUserRootFolder } from '@/app/lib/backend/helperFunctions/getUserRootFolder';

// Get items by parent ID
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const rootFolder = await getUserRootFolder();

    await connectDB();

    // If parentId is not provided, return items from root folder
    const query = parentId ? { parentId } : { _id: rootFolder };
    
    const items = await Item.find(query);
    return NextResponse.json(items);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create new folder
export async function POST(request: Request) {
  try {
    const { name, parentId, type, mimeType, size, url } = await request.json();
    const rootFolder = await getUserRootFolder();

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    if (!['file', 'folder'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "file" or "folder".' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify parent folder exists and is accessible
    if (parentId) {
      const parentFolder = await Item.findById(parentId);
      if (!parentFolder || parentFolder.type !== 'folder') {
        return NextResponse.json(
          { error: 'Invalid parent folder' },
          { status: 400 }
        );
      }
    }

    let itemData: any = {
      name,
      type,
      parentId: parentId || rootFolder,
    };

    if (type === 'file') {
      itemData.mimeType = mimeType || null;
      itemData.size = size || 0;
      itemData.url = url || null;
    }

    const item = await Item.create(itemData);

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 