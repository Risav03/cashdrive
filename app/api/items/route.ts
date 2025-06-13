import { authOptions } from '@/app/lib/backend/authConfig';
import { getUserRootFolder } from '@/app/lib/backend/helperFunctions/getUserRootFolder';
import { validateS3Config } from '@/app/lib/config';
import connectDB from '@/app/lib/mongodb';
import { uploadFileToS3 } from '@/app/lib/s3';
import { Item } from '@/app/models/Item';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const rootFolder = await getUserRootFolder();

    await connectDB();

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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type');
    const rootFolder = await getUserRootFolder();
    await connectDB();

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const url = formData.get('url') as string;
      const parentId = formData.get('parentId') as string;
      const name = formData.get('name') as string;

      if (!name) {
        return NextResponse.json(
          { error: 'Name is required' },
          { status: 400 }
        );
      }

      if (!file && !url) {
        return NextResponse.json(
          { error: 'Either file or URL must be provided' },
          { status: 400 }
        );
      }

      if (parentId) {
        const parentFolder = await Item.findById(parentId);
        if (!parentFolder || parentFolder.type !== 'folder') {
          return NextResponse.json(
            { error: 'Invalid parent folder' },
            { status: 400 }
          );
        }
      }

      let fileUrl: string;
      let fileSize: number = 0;
      let mimeType: string | null = null;

      if (file) {
        fileSize = file.size;
        mimeType = file.type;

        if (validateS3Config()) {
          try {
            const uploadResult = await uploadFileToS3(file, name, session.user.id);
            fileUrl = uploadResult.url;
            fileSize = uploadResult.size;
          } catch (error) {
            console.error('S3 upload failed:', error);
            return NextResponse.json(
              { error: 'File upload failed' },
              { status: 500 }
            );
          }
        } else {
          console.warn('S3 not configured, using placeholder URL');
          fileUrl = 'placeholder-url-s3-not-configured';
        }
      } else if (url) {
        fileUrl = url;
        fileSize = 0;
        mimeType = null;
      } else {
        return NextResponse.json(
          { error: 'Either file or URL must be provided' },
          { status: 400 }
        );
      }

      const item = await Item.create({
        name,
        type: 'file',
        parentId: parentId || rootFolder,
        size: fileSize,
        mimeType: mimeType,
        url: fileUrl,
      });

      return NextResponse.json(item, { status: 201 });
    }
    else {
      const body = await request.json();
      const { name, parentId, type } = body;

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

      if (parentId) {
        const parentFolder = await Item.findById(parentId);
        if (!parentFolder || parentFolder.type !== 'folder') {
          return NextResponse.json(
            { error: 'Invalid parent folder' },
            { status: 400 }
          );
        }
      }

      if (type === 'folder') {
        const item = await Item.create({
          name,
          type: 'folder',
          parentId: parentId || rootFolder,
        });
        return NextResponse.json(item, { status: 201 });
      }


    }

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 