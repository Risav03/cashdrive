import { authOptions } from '@/app/lib/backend/authConfig';
import { Item, Listing, Transaction } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Generate unique receipt number
function generateReceiptNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RCP-${timestamp}-${random}`;
}

// Copy item to buyer's marketplace folder
async function copyItemToMarketplaceFolder(buyerId: string, item: any): Promise<any> {
  try {
    // Get buyer's root folder
    const User = (await import('@/app/models/User')).default;
    const buyer = await User.findById(buyerId);
    if (!buyer) {
      throw new Error('Buyer not found');
    }

    // Find or create marketplace folder in buyer's root folder
    let marketplaceFolder = await Item.findOne({
      name: 'marketplace',
      type: 'folder',
      parentId: buyer.rootFolder.toString()
    });

    if (!marketplaceFolder) {
      marketplaceFolder = await Item.create({
        name: 'marketplace',
        type: 'folder',
        parentId: buyer.rootFolder.toString(),
        owner: buyerId
      });
    }

    // Recursively copy the item and all its contents
    const copiedItem = await copyItemRecursively(item, marketplaceFolder._id.toString(), buyerId);
    return copiedItem;
  } catch (error) {
    console.error('Error copying item to marketplace folder:', error);
    throw error;
  }
}

// Recursive function to copy an item and all its children
async function copyItemRecursively(originalItem: any, newParentId: string, buyerId: string): Promise<any> {
  // Create a copy of the current item
  const copiedItem = await Item.create({
    name: `${originalItem.name} (Purchased)`,
    type: originalItem.type,
    parentId: newParentId,
    size: originalItem.size || 0,
    mimeType: originalItem.mimeType,
    url: originalItem.url,
    owner: buyerId
  });

  // If it's a folder, recursively copy all its children
  if (originalItem.type === 'folder') {
    const children = await Item.find({ parentId: originalItem._id.toString() });
    
    for (const child of children) {
      await copyItemRecursively(child, copiedItem._id.toString(), buyerId);
    }
  }

  return copiedItem;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const params = await context.params;
    const listing = await Listing.findById(params.id)
      .populate('item')
      .populate('seller');

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.status !== 'active') {
      return NextResponse.json({ 
        error: 'This listing is no longer available for purchase' 
      }, { status: 400 });
    }

    if (listing.seller._id.toString() === session.user.id) {
      return NextResponse.json({ 
        error: 'You cannot purchase your own listing' 
      }, { status: 400 });
    }

    // Check if user already purchased this item
    const existingTransaction = await Transaction.findOne({
      listing: params.id,
      buyer: session.user.id,
      status: 'completed'
    });

    if (existingTransaction) {
      return NextResponse.json({ 
        error: 'You have already purchased this item' 
      }, { status: 400 });
    }

    // Generate transaction details
    const transactionId = uuidv4();
    const receiptNumber = generateReceiptNumber();

    // Create transaction record
    const transaction = await Transaction.create({
      listing: listing._id,
      buyer: session.user.id,
      seller: listing.seller._id,
      item: listing.item._id,
      amount: listing.price,
      status: 'completed',
      transactionId,
      receiptNumber,
      purchaseDate: new Date()
    });

    // Copy item to buyer's marketplace folder
    const copiedItem = await copyItemToMarketplaceFolder(session.user.id, listing.item);

    // Populate transaction for response
    await transaction.populate('listing', 'title price');
    await transaction.populate('buyer', 'name email');
    await transaction.populate('seller', 'name email');
    await transaction.populate('item', 'name type size mimeType');

    return NextResponse.json({
      transaction,
      copiedItem: {
        _id: copiedItem._id,
        name: copiedItem.name,
        path: `/marketplace/${copiedItem.name}`
      },
      message: 'Purchase completed successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/listings/[id]/purchase error:', error);
    
    if (error.code === 11000) {
      return NextResponse.json({ 
        error: 'Transaction already exists' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to complete purchase' 
    }, { status: 500 });
  }
} 