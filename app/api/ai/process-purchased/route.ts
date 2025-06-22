import { processFileForAI } from '@/app/lib/ai/aiService';
import { authOptions } from '@/app/lib/backend/authConfig';
import { Item, Transaction } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

// Constants
const FOLDER_NAMES = {
  MARKETPLACE: 'marketplace',
} as const;

const CONTENT_SOURCES = {
  MARKETPLACE_PURCHASE: 'marketplace_purchase',
} as const;

const PROCESSING_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  ALREADY_PROCESSED: 'already_processed',
  COMPLETED: 'completed',
} as const;

const MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
  TRANSACTION_OR_ITEMS_REQUIRED: 'Either transactionId or itemIds must be provided',
  TRANSACTION_NOT_FOUND: 'Transaction not found',
  NO_ITEMS_FOUND: 'No items found to process',
  PROCESSING_COMPLETED: 'Processing completed',
  ALREADY_PROCESSED: 'Item was already processed for AI',
  SUCCESSFULLY_PROCESSED: 'Successfully processed for AI use',
  PROCESSING_ERROR: 'Failed to process purchased content',
} as const;

const ITEM_MARKERS = {
  PURCHASED_SUFFIX: '(Purchased)',
} as const;

const LOG_MESSAGES = {
  PROCESSING_ERROR: 'Process purchased content error:',
  ITEM_PROCESSING_ERROR: 'Error processing item',
} as const;

// Types
type ProcessingStatus = typeof PROCESSING_STATUS[keyof typeof PROCESSING_STATUS];

interface ProcessPurchasedRequest {
  transactionId?: string;
  itemIds?: string[];
}

interface ProcessingResult {
  itemId: string;
  name: string;
  status: ProcessingStatus;
  message: string;
}

interface ProcessingSummary {
  total: number;
  successful: number;
  failed: number;
  alreadyProcessed: number;
}

interface ProcessPurchasedResponse {
  message: string;
  results: ProcessingResult[];
  summary: ProcessingSummary;
}

// Helper functions
const isValidObjectId = (id: string): boolean => /^[0-9a-fA-F]{24}$/.test(id);

const isMarketplacePurchasedItem = (item: any): boolean => {
  const parent = item.parentId as any;
  return parent && 
         parent.name === FOLDER_NAMES.MARKETPLACE && 
         item.name.includes(ITEM_MARKERS.PURCHASED_SUFFIX);
};

const isAlreadyProcessed = (item: any): boolean => 
  item.aiProcessing?.status === PROCESSING_STATUS.COMPLETED;

const createProcessingResult = (
  item: any, 
  status: ProcessingStatus, 
  message: string
): ProcessingResult => ({
  itemId: item._id,
  name: item.name,
  status,
  message,
});

const calculateSummary = (results: ProcessingResult[]): ProcessingSummary => ({
  total: results.length,
  successful: results.filter(r => r.status === PROCESSING_STATUS.SUCCESS).length,
  failed: results.filter(r => r.status === PROCESSING_STATUS.ERROR).length,
  alreadyProcessed: results.filter(r => r.status === PROCESSING_STATUS.ALREADY_PROCESSED).length,
});

// Item retrieval functions
async function getItemsFromTransaction(transactionId: string, userId: string): Promise<any[]> {
  const transaction = await Transaction.findById(transactionId)
    .populate('buyer')
    .populate('item');

  if (!transaction) {
    throw new Error(MESSAGES.TRANSACTION_NOT_FOUND);
  }

  if (transaction.buyer._id.toString() !== userId) {
    throw new Error(MESSAGES.UNAUTHORIZED);
  }

  // Find all purchased items in marketplace folder
  const marketplaceItems = await Item.find({
    owner: userId,
    parentId: { $exists: true }
  }).populate('parentId');

  return marketplaceItems.filter(isMarketplacePurchasedItem);
}

async function getItemsFromIds(itemIds: string[], userId: string): Promise<any[]> {
  return Item.find({
    _id: { $in: itemIds },
    owner: userId
  });
}

async function getItemsToProcess(
  request: ProcessPurchasedRequest, 
  userId: string
): Promise<any[]> {
  if (request.transactionId) {
    return getItemsFromTransaction(request.transactionId, userId);
  }
  
  if (request.itemIds) {
    return getItemsFromIds(request.itemIds, userId);
  }
  
  return [];
}

// Item processing functions
async function markAsMarketplaceContent(item: any): Promise<void> {
  item.contentSource = CONTENT_SOURCES.MARKETPLACE_PURCHASE;
  await item.save();
}

async function processItemForAI(item: any): Promise<ProcessingResult> {
  try {
    // Check if already processed
    if (isAlreadyProcessed(item)) {
      return createProcessingResult(
        item, 
        PROCESSING_STATUS.ALREADY_PROCESSED, 
        MESSAGES.ALREADY_PROCESSED
      );
    }

    // Mark as marketplace content and process
    await markAsMarketplaceContent(item);
    await processFileForAI(item._id.toString());

    return createProcessingResult(
      item, 
      PROCESSING_STATUS.SUCCESS, 
      MESSAGES.SUCCESSFULLY_PROCESSED
    );

  } catch (error: any) {
    console.error(`${LOG_MESSAGES.ITEM_PROCESSING_ERROR} ${item._id}:`, error);
    return createProcessingResult(
      item, 
      PROCESSING_STATUS.ERROR, 
      error.message
    );
  }
}

async function processAllItems(items: any[]): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];
  
  for (const item of items) {
    const result = await processItemForAI(item);
    results.push(result);
  }
  
  return results;
}

// Main request handler
async function handleProcessPurchased(
  request: ProcessPurchasedRequest, 
  userId: string
): Promise<ProcessPurchasedResponse> {
  const itemsToProcess = await getItemsToProcess(request, userId);

  if (itemsToProcess.length === 0) {
    throw new Error(MESSAGES.NO_ITEMS_FOUND);
  }

  const results = await processAllItems(itemsToProcess);
  const summary = calculateSummary(results);

  return {
    message: MESSAGES.PROCESSING_COMPLETED,
    results,
    summary,
  };
}

// Request validation
function validateRequest(request: ProcessPurchasedRequest): void {
  if (!request.transactionId && !request.itemIds) {
    throw new Error(MESSAGES.TRANSACTION_OR_ITEMS_REQUIRED);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    await connectDB();

    const requestData: ProcessPurchasedRequest = await request.json();
    validateRequest(requestData);

    const response = await handleProcessPurchased(requestData, session.user.id);
    return NextResponse.json(response);

  } catch (error: any) {
    console.error(LOG_MESSAGES.PROCESSING_ERROR, error);
    return NextResponse.json(
      { error: MESSAGES.PROCESSING_ERROR },
      { status: 500 }
    );
  }
} 