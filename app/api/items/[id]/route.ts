import { authOptions } from '@/app/lib/backend/authConfig';
import { getUserRootFolder } from '@/app/lib/backend/helperFunctions/getUserRootFolder';
import { secrets, validateS3Config } from '@/app/lib/config';
import connectDB from '@/app/lib/mongodb';
import { Item } from '@/app/models/Item';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

const s3Client = new S3Client({
  region: secrets.AWS_REGION,
  credentials: {
    accessKeyId: secrets.AWS_ACCESS_KEY_ID,
    secretAccessKey: secrets.AWS_SECRET_ACCESS_KEY,
  },
});


export async function GET(
  request: NextRequest,
){
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const id = request.nextUrl.pathname.split("/")[3]

    await getUserRootFolder();
    await connectDB();
    
    const item = await Item.findOne({ _id: id, owner: session.user.id });
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = request.nextUrl.pathname.split("/")[3];
    const contentType = request.headers.get('content-type');

    let name: string | undefined;
    let parentId: string | undefined;

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const nameField = formData.get('name');
      const parentIdField = formData.get('parentId');
      
      name = nameField ? nameField.toString() : undefined;
      parentId = parentIdField ? parentIdField.toString() : undefined;
    } 
    else {
      const body = await request.json();
      name = body.name;
      parentId = body.parentId;
    }

    await connectDB();

    const item = await Item.findOne({ _id: id, owner: session.user.id });
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (parentId !== undefined && parentId !== item.parentId) {
      if (parentId) {
        const parentFolder = await Item.findOne({ _id: parentId, owner: session.user.id });
        if (!parentFolder || parentFolder.type !== 'folder') {
          return NextResponse.json(
            { error: 'Invalid parent folder' },
            { status: 400 }
          );
        }
        
        if (item.type === 'folder') {
          const isDescendant = await checkIfDescendant(item._id, parentId);
          if (isDescendant) {
            return NextResponse.json(
              { error: 'Cannot move folder into itself or its children' },
              { status: 400 }
            );
          }
        }
      }
      item.parentId = parentId;
    }

    if (name && name !== item.name) {
      item.name = name;
    }

    await item.save();
    return NextResponse.json(item);

  } catch (error: any) {
    console.error('Update item error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = request.nextUrl.pathname.split("/")[3];
    await connectDB();

    const item = await Item.findOne({ _id: id, owner: session.user.id });
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const itemsToDelete = await collectItemsToDelete(id, session.user.id);
    
    if (validateS3Config()) {
      for (const itemToDelete of itemsToDelete) {
        if (itemToDelete.type === 'file' && itemToDelete.url && itemToDelete.url.startsWith('https://')) {
          try {
            const key = extractS3KeyFromUrl(itemToDelete.url);
            if (key) {
              const deleteCommand = new DeleteObjectCommand({
                Bucket: secrets.AWS_S3_BUCKET_NAME,
                Key: key,
              });
              await s3Client.send(deleteCommand);
              console.log(`Deleted S3 object: ${key}`);
            }
          } catch (s3Error) {
            console.error(`Failed to delete S3 object for item ${itemToDelete._id}:`, s3Error);
          }
        }
      }
    }

    const itemIds = itemsToDelete.map(item => item._id);
    await Item.deleteMany({ _id: { $in: itemIds } });

    return NextResponse.json({ 
      message: 'Item and children deleted successfully',
      deletedCount: itemIds.length 
    });

  } catch (error: any) {
    console.error('Delete item error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function collectItemsToDelete(itemId: string, ownerId: string): Promise<any[]> {
  const item = await Item.findById(itemId);
  if (!item || item.owner !== ownerId) return [];

  const itemsToDelete = [item];

  if (item.type === 'folder') {
    const children = await Item.find({ parentId: itemId });
    for (const child of children) {
      const childItems = await collectItemsToDelete(child._id, ownerId);
      itemsToDelete.push(...childItems);
    }
  }

  return itemsToDelete;
}

async function checkIfDescendant(sourceId: string, targetId: string): Promise<boolean> {
  if (sourceId === targetId) return true;
  
  const target = await Item.findById(targetId);
  if (!target || !target.parentId) return false;
  
  return await checkIfDescendant(sourceId, target.parentId);
}

function extractS3KeyFromUrl(url: string): string | null {
  try {
    const urlParts = new URL(url);
    if (urlParts.hostname.includes('.s3.') && urlParts.hostname.includes('.amazonaws.com')) {
      return urlParts.pathname.substring(1);
    }
    return null;
  } catch {
    return null;
  }
} 