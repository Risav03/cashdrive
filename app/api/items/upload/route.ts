import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import { Item } from '@/app/models/Item';
import { getUserRootFolder } from '@/app/lib/backend/helperFunctions/getUserRootFolder';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const parentId = formData.get('parentId') as string;
    const name = formData.get('name') as string;

    if (!file || !name) {
      return NextResponse.json(
        { error: 'File and name are required' },
        { status: 400 }
      );
    }

    const rootFolder = await getUserRootFolder();
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

    // Here you would typically:
    // 1. Upload the file to a storage service (S3, etc.)
    // 2. Get the URL and size from the upload response
    // For now, we'll just create the database entry
    const item = await Item.create({
      name,
      type: 'file',
      parentId: parentId || rootFolder,
      size: file.size,
      mimeType: file.type,
      url: 'placeholder-url' // Replace with actual upload URL
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Configure the API route to handle larger files
export const config = {
  api: {
    bodyParser: false
  }
}; 