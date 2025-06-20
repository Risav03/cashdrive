import { processFileForAI } from '@/app/lib/ai/aiService';
import { authOptions } from '@/app/lib/backend/authConfig';
import { validateS3Config } from '@/app/lib/config';
import connectDB from '@/app/lib/mongodb';
import { cleanupOrphanedS3File, uploadFileToS3 } from '@/app/lib/s3';
import { Item } from '@/app/models/Item';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor');

    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query: any = parentId 
      ? { parentId, owner: session.user.id } 
      : { _id: session.user.rootFolder };

    if (!parentId) {
      const items = await Item.find(query);
      return NextResponse.json({
        items,
        pagination: {
          current: 1,
          total: 1,
          count: items.length,
          totalItems: items.length,
          hasNextPage: false,
          hasPreviousPage: false,
          nextCursor: null,
          limit: items.length
        }
      });
    }

    if (parentId) {
      const parentFolder = await Item.findOne({ 
        _id: parentId, 
        owner: session.user.id,
        type: 'folder'
      });
      
      if (!parentFolder) {
        return NextResponse.json({ error: 'Parent folder not found or unauthorized' }, { status: 404 });
      }
    }

    if (cursor) {
      query._id = { $lt: cursor };
    }

    const totalItems = await Item.countDocuments({
      parentId,
      owner: session.user.id
    });

    const items = await Item.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = items.length === limit;
    const hasPreviousPage = page > 1;
    const nextCursor = hasNextPage ? items[items.length - 1]._id : null;

    return NextResponse.json({
      items,
      pagination: {
        current: page,
        total: totalPages,
        count: items.length,
        totalItems,
        hasNextPage,
        hasPreviousPage,
        nextCursor,
        limit
      }
    });

  } catch (error: any) {
    console.error('Items GET API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const dbSession = await mongoose.startSession();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type');
    await connectDB();

    if (contentType?.includes('multipart/form-data')) {
      return await dbSession.withTransaction(async () => {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const url = formData.get('url') as string;
        const parentId = formData.get('parentId') as string;
        const name = formData.get('name') as string;

        if (!name) {
          throw new Error('Name is required');
        }

        if (!file && !url) {
          throw new Error('Either file or URL must be provided');
        }

        if (parentId) {
          const parentFolder = await Item.findById(parentId).session(dbSession);
          if (!parentFolder || parentFolder.type !== 'folder') {
            throw new Error('Invalid parent folder');
          }
          
          if (parentFolder.owner.toString() !== session.user.id) {
            throw new Error('Unauthorized access to parent folder');
          }
        }

        let fileUrl: string;
        let fileSize: number = 0;
        let mimeType: string | null = null;
        let uploadResult: any = null;

        if (file) {
          fileSize = file.size;
          mimeType = file.type;

          if (validateS3Config()) {
            try {
              uploadResult = await uploadFileToS3(file, name, session.user.id);
              fileUrl = uploadResult.url;
              fileSize = uploadResult.size;
            } catch (error) {
              console.error('S3 upload failed:', error);
              throw new Error('File upload failed');
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
          throw new Error('Either file or URL must be provided');
        }

        try {
          const [item] = await Item.create([{
            name,
            type: 'file',
            parentId: parentId || session.user.rootFolder,
            owner: session.user.id,
            size: fileSize,
            mimeType: mimeType,
            url: fileUrl,
          }], { session: dbSession });

          const shouldProcessAI = mimeType && [
            'text/plain', 
            'application/pdf', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ].includes(mimeType);

          if (shouldProcessAI) {
            await Item.findByIdAndUpdate(
              item._id, 
              { 'aiProcessing.queued': true, 'aiProcessing.queuedAt': new Date() },
              { session: dbSession }
            );
          }

          const itemId = item._id.toString();
          
          const response = NextResponse.json(item, { status: 201 });

          if (shouldProcessAI) {
            setTimeout(async () => {
              try {
                await processFileForAI(itemId);
              } catch (error) {
                console.error('AI processing failed for file:', item.name, error);
              }
            }, 1000); // 1 second delay
          }

          return response;

        } catch (dbError) {
          if (uploadResult && validateS3Config()) {
            try {
              console.warn('Database operation failed, attempting S3 cleanup for:', uploadResult.url);
              await cleanupOrphanedS3File(uploadResult);
            } catch (cleanupError) {
              console.error('Failed to cleanup S3 file:', cleanupError);
            }
          }
          throw dbError;
        }
      });

    } else {
      return await dbSession.withTransaction(async () => {
        const body = await request.json();
        const { name, parentId, type } = body;

        if (!name || !type) {
          throw new Error('Name and type are required');
        }

        if (!['file', 'folder'].includes(type)) {
          throw new Error('Invalid type. Must be "file" or "folder".');
        }

        if (parentId) {
          const parentFolder = await Item.findById(parentId).session(dbSession);
          if (!parentFolder || parentFolder.type !== 'folder') {
            throw new Error('Invalid parent folder');
          }
          
          if (parentFolder.owner.toString() !== session.user.id) {
            throw new Error('Unauthorized access to parent folder');
          }
        }

        if (type === 'folder') {
          const [item] = await Item.create([{
            name,
            type: 'folder',
            parentId: parentId || session.user.rootFolder,
            owner: session.user.id,
          }], { session: dbSession });

          return NextResponse.json(item, { status: 201 });
        }

        throw new Error('Unsupported operation');
      });
    }

  } catch (error: any) {
    console.error('API Error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (error.message.includes('Name is required') || 
        error.message.includes('Either file or URL must be provided') ||
        error.message.includes('Invalid parent folder') ||
        error.message.includes('Invalid type')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    if (error.message.includes('File upload failed')) {
      return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await dbSession.endSession();
  }
} 