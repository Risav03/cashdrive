import { authOptions } from '@/app/lib/backend/authConfig';
import { validateS3Config } from '@/app/lib/config';
import connectDB from '@/app/lib/mongodb';
import { deleteFileFromS3ByUrl } from '@/app/lib/s3';
import { AIChunk } from '@/app/models/AIChunk';
import { Item } from '@/app/models/Item';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';


export async function GET(
  request: NextRequest,
){
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const id = request.nextUrl.pathname.split("/")[3]

    await connectDB();

    const item = await Item.findOne({ 
      _id: id, 
      owner: session.user.id 
    });
    
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(item);

  } catch (error: any) {
    console.error('GET /api/items/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const dbSession = await mongoose.startSession();
  
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

    return await dbSession.withTransaction(async () => {
      const item = await Item.findOne({ 
        _id: id, 
        owner: session.user.id 
      }).session(dbSession);
      
      if (!item) {
        throw new Error('Item not found');
      }

      if (parentId !== undefined && parentId !== item.parentId) {
        if (parentId) {
          const parentFolder = await Item.findOne({ 
            _id: parentId, 
            owner: session.user.id 
          }).session(dbSession);
          
          if (!parentFolder || parentFolder?.type !== 'folder') {
            throw new Error('Invalid parent folder');
          }
          
          if (item?.type === 'folder') {
            const isDescendant = await checkIfDescendantWithSession(item._id, parentId, dbSession);
            if (isDescendant) {
              throw new Error('Cannot move folder into itself or its children');
            }
          }
        }
        item.parentId = parentId;
      }

      if (name && name !== item.name) {
        item.name = name;
      }

      await item.save({ session: dbSession });
      return NextResponse.json(item);
    });

  } catch (error: any) {
    console.error('PUT /api/items/[id] error:', error);
    
    if (error.message === 'Item not found') {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    if (error.message === 'Invalid parent folder' || 
        error.message === 'Cannot move folder into itself or its children') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  } finally {
    await dbSession.endSession();
  }
}

export async function DELETE(request: NextRequest) {
  const dbSession = await mongoose.startSession();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = request.nextUrl.pathname.split("/")[3];
    await connectDB();

    return await dbSession.withTransaction(async () => {
      const item = await Item.findOne({ 
        _id: id, 
        owner: session.user.id 
      }).session(dbSession);
      
      if (!item) {
        throw new Error('Item not found');
      }

      const itemsToDelete = await collectItemsToDeleteWithSession(id, session.user.id, dbSession);
      
      const itemIds = itemsToDelete.map(item => item._id);
      await AIChunk.deleteMany({ item: { $in: itemIds } }).session(dbSession);
      
      const s3DeletionPromises = [];
      if (validateS3Config()) {
        for (const itemToDelete of itemsToDelete) {
          if (itemToDelete?.type === 'file' && itemToDelete.url && itemToDelete.url.startsWith('https://')) {
            s3DeletionPromises.push(
              deleteFileFromS3ByUrl(itemToDelete.url)
                .then(() => console.log(`Deleted S3 object: ${itemToDelete.url}`))
                .catch(s3Error => console.error(`Failed to delete S3 object for item ${itemToDelete._id}:`, s3Error))
            );
          }
        }
      }

      await Item.deleteMany({ _id: { $in: itemIds } }).session(dbSession);

      if (s3DeletionPromises.length > 0) {
        Promise.all(s3DeletionPromises).catch(error => {
          console.error('S3 cleanup errors occurred:', error);
        });
      }

      return NextResponse.json({ 
        message: 'Item and children deleted successfully',
        deletedCount: itemIds.length 
      });
    });

  } catch (error: any) {
    console.error('DELETE /api/items/[id] error:', error);
    
    if (error.message === 'Item not found') {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  } finally {
    await dbSession.endSession();
  }
}

async function collectItemsToDeleteWithSession(
  itemId: string, 
  ownerId: string, 
  session: mongoose.ClientSession
): Promise<any[]> {
  const item = await Item.findById(itemId).session(session);
  console.log('item', item);
  if (!item || String(item.owner) !== String(ownerId)) return [];

  const itemsToDelete = [item];
  console.log('itemsToDelete', itemsToDelete);

  if (item?.type === 'folder') {
    const children = await Item.find({ parentId: itemId }).session(session);
    for (const child of children) {
      const childItems = await collectItemsToDeleteWithSession(child._id, ownerId, session);
      itemsToDelete.push(...childItems);
    }
  }
  console.log('itemsToDelete', itemsToDelete);
  return itemsToDelete;
}

async function checkIfDescendantWithSession(
  sourceId: string, 
  targetId: string, 
  session: mongoose.ClientSession
): Promise<boolean> {
  if (sourceId === targetId) return true;
  
  const target = await Item.findById(targetId).session(session);
  if (!target || !target.parentId) return false;
  
  return await checkIfDescendantWithSession(sourceId, target.parentId, session);
}

