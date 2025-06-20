import { processFileForAI } from '@/app/lib/ai/aiService';
import { authOptions } from '@/app/lib/backend/authConfig';
import { Item, Transaction } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { transactionId, itemIds } = await request.json();

    if (!transactionId && !itemIds) {
      return NextResponse.json({ 
        error: 'Either transactionId or itemIds must be provided' 
      }, { status: 400 });
    }

    let itemsToProcess: any[] = [];

    if (transactionId) {
      // Process items from a specific transaction
      const transaction = await Transaction.findById(transactionId)
        .populate('buyer')
        .populate('item');

      if (!transaction) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }

      if (transaction.buyer._id.toString() !== session.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      // Find all purchased items in marketplace folder
      const marketplaceItems = await Item.find({
        owner: session.user.id,
        parentId: { $exists: true }
      }).populate('parentId');

      // Filter for items in marketplace folder that came from this transaction
      itemsToProcess = marketplaceItems.filter(item => {
        const parent = item.parentId as any;
        return parent && parent.name === 'marketplace' && 
               item.name.includes('(Purchased)');
      });

    } else if (itemIds) {
      // Process specific items
      itemsToProcess = await Item.find({
        _id: { $in: itemIds },
        owner: session.user.id
      });
    }

    if (itemsToProcess.length === 0) {
      return NextResponse.json({ 
        error: 'No items found to process' 
      }, { status: 404 });
    }

    const processResults = [];

    for (const item of itemsToProcess) {
      try {
        // Check if already processed
        if (item.aiProcessing?.status === 'completed') {
          processResults.push({
            itemId: item._id,
            name: item.name,
            status: 'already_processed',
            message: 'Item was already processed for AI'
          });
          continue;
        }

        // Mark as marketplace content
        item.contentSource = 'marketplace_purchase';
        await item.save();

        // Process for AI
        await processFileForAI(item._id.toString());

        processResults.push({
          itemId: item._id,
          name: item.name,
          status: 'success',
          message: 'Successfully processed for AI use'
        });

      } catch (error: any) {
        console.error(`Error processing item ${item._id}:`, error);
        processResults.push({
          itemId: item._id,
          name: item.name,
          status: 'error',
          message: error.message
        });
      }
    }

    return NextResponse.json({
      message: 'Processing completed',
      results: processResults,
      summary: {
        total: itemsToProcess.length,
        successful: processResults.filter(r => r.status === 'success').length,
        failed: processResults.filter(r => r.status === 'error').length,
        alreadyProcessed: processResults.filter(r => r.status === 'already_processed').length
      }
    });

  } catch (error: any) {
    console.error('Process purchased content error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process purchased content' 
    }, { status: 500 });
  }
} 