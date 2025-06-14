import { authOptions } from '@/app/lib/backend/authConfig';
import connectDB from '@/app/lib/mongodb';
import { Item } from '@/app/models/Item';
import SharedLink from '@/app/models/SharedLink';
import User from '@/app/models/User';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

async function copyItemRecursively(originalItem: any, newParentId: string, ownerId: string): Promise<any> {
  const copiedItem = await Item.create({
    name: `${originalItem.name} (Shared)`,
    type: originalItem.type,
    parentId: newParentId,
    owner: ownerId,
    size: originalItem.size || 0,
    mimeType: originalItem.mimeType,
    url: originalItem.url
  });

  if (originalItem.type === 'folder') {
    const children = await Item.find({ parentId: originalItem._id.toString() });
    
    for (const child of children) {
      await copyItemRecursively(child, copiedItem._id.toString(), ownerId);
    }
  }

  return copiedItem;
}


async function copySharedItemToDrive(userId: string, item: any): Promise<any> {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let sharedFolder = await Item.findOne({
      name: 'shared',
      type: 'folder',
      parentId: user.rootFolder.toString()
    });

    if (!sharedFolder) {
      sharedFolder = await Item.create({
        name: 'shared',
        type: 'folder',
        parentId: user.rootFolder.toString(),
        owner: userId
      });
    }

    const copiedItem = await copyItemRecursively(item, sharedFolder._id.toString(), userId);
    return copiedItem;
  } catch (error) {
    console.error('Error copying shared item to drive:', error);
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;
    await connectDB();
    
    const sharedLink = await SharedLink.findOne({ 
      linkId, 
      isActive: true 
    });
    
    if (!sharedLink) {
      return NextResponse.json({ error: 'Link not found or expired' }, { status: 404 });
    }
    
    if (sharedLink.expiresAt && new Date() > sharedLink.expiresAt) {
      return NextResponse.json({ error: 'Link has expired' }, { status: 410 });
    }
    
    await SharedLink.findByIdAndUpdate(sharedLink._id, { 
      $inc: { accessCount: 1 } 
    });
    
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    if (sharedLink.type === 'public') {
      return NextResponse.json({
        link: sharedLink,
        canAccess: true,
        requiresPayment: false
      });
    }
    
    if (sharedLink.type === 'monetized') {
      if (!userId) {
        return NextResponse.json({
          link: {
            _id: sharedLink._id,
            title: sharedLink.title,
            description: sharedLink.description,
            type: sharedLink.type,
            price: sharedLink.price,
            item: {
              name: sharedLink.item.name,
              type: sharedLink.item.type,
              size: sharedLink.item.size
            }
          },
          canAccess: false,
          requiresPayment: true,
          requiresAuth: true
        });
      }
      
      const hasPaid = sharedLink.paidUsers.some(
        (paidUserId: any) => paidUserId.toString() === userId
      );
      
      if (hasPaid) {
        return NextResponse.json({
          link: sharedLink,
          canAccess: true,
          requiresPayment: false,
          alreadyPaid: true
        });
      } else {
        return NextResponse.json({
          link: {
            _id: sharedLink._id,
            title: sharedLink.title,
            description: sharedLink.description,
            type: sharedLink.type,
            price: sharedLink.price,
            item: {
              name: sharedLink.item.name,
              type: sharedLink.item.type,
              size: sharedLink.item.size
            }
          },
          canAccess: false,
          requiresPayment: true,
          requiresAuth: false
        });
      }
    }
    
    return NextResponse.json({ error: 'Invalid link type' }, { status: 400 });
  } catch (error: any) {
    console.error('GET /api/shared-links/[linkId] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { linkId } = await params;
    await connectDB();
    
    const sharedLink = await SharedLink.findOne({ 
      linkId, 
      isActive: true 
    });
    
    if (!sharedLink) {
      return NextResponse.json({ error: 'Link not found or expired' }, { status: 404 });
    }
    
    if (sharedLink.expiresAt && new Date() > sharedLink.expiresAt) {
      return NextResponse.json({ error: 'Link has expired' }, { status: 410 });
    }
    
    const userId = session.user.id;
    
    if (sharedLink.type === 'public') {
      const copiedItem = await copySharedItemToDrive(userId, sharedLink.item);
      
      return NextResponse.json({
        success: true,
        message: `${sharedLink.item.name} has been added to your drive in the 'shared' folder`,
        copiedItem
      });
    }
    
    if (sharedLink.type === 'monetized') {
      const hasPaid = sharedLink.paidUsers.some(
        (paidUserId: any) => paidUserId.toString() === userId
      );
      
      if (!hasPaid) {
        return NextResponse.json({ 
          error: 'Payment required to access this content' 
        }, { status: 402 });
      }
      
      const copiedItem = await copySharedItemToDrive(userId, sharedLink.item);
      
      return NextResponse.json({
        success: true,
        message: `${sharedLink.item.name} has been added to your drive in the 'shared' folder`,
        copiedItem
      });
    }
    
    return NextResponse.json({ error: 'Invalid link type' }, { status: 400 });
  } catch (error: any) {
    console.error('POST /api/shared-links/[linkId] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 