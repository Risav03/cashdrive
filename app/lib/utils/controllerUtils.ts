import { authOptions } from '@/app/lib/backend/authConfig';
import connectDB from '@/app/lib/mongodb';
import mongoose, { PopulateOptions, SortOrder } from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

type PopulateArg = string | PopulateOptions | { path: string } | (string | PopulateOptions | { path: string })[];

export interface PaginationParams {
  page?: number;
  limit?: number;
  populate?: PopulateArg;
  sort?: { [key: string]: SortOrder };
}

export interface PaginationResult<T> {
  items: T[];
  pagination: {
    current: number;
    total: number;
    count: number;
    totalItems: number;
  };
}

export async function handlePaginatedRequest<T>(
  query: any,
  model: mongoose.Model<T>,
  params: PaginationParams = {}
): Promise<PaginationResult<T>> {
  const page = parseInt(String(params.page || '1'));
  const limit = parseInt(String(params.limit || '20'));
  const skip = (page - 1) * limit;

  await connectDB()

  let findQuery = model.find(query);
  
  if (params.populate) {
    if (Array.isArray(params.populate)) {
      params.populate.forEach(populateOption => {
        findQuery = findQuery.populate(populateOption as any);
      });
    } else {
      findQuery = findQuery.populate(params.populate as any);
    }
  }

  if (params.sort) {
    findQuery = findQuery.sort(params.sort);
  }

  const [items, total] = await Promise.all([
    findQuery.skip(skip).limit(limit),
    model.countDocuments(query)
  ]);

  return {
    items,
    pagination: {
      current: page,
      total: Math.ceil(total / limit),
      count: items.length,
      totalItems: total
    }
  };
}

export async function withErrorHandler(
  handler: () => Promise<NextResponse>,
  customErrorMap?: Record<string, number>
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error: any) {
    console.error('API error:', error);
    
    const defaultErrorMap: Record<string, number> = {
      'not found': 404,
      'expired': 410,
      'already exists': 409,
      'Unauthorized': 401,
      'Payment required': 402,
    };

    const errorMap = { ...defaultErrorMap, ...customErrorMap };
    let status = 500;

    for (const [message, code] of Object.entries(errorMap)) {
      if (error.message.includes(message)) {
        status = code;
        break;
      }
    }

    return NextResponse.json({ error: error.message || 'Internal server error' }, { status });
  }
}

export async function withAuthCheck(request: NextRequest): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

export async function withTransaction<T>(
  handler: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  await connectDB();
  
  // Retry logic for transaction conflicts
  const maxRetries = 3;
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        return await handler(session);
      }, {
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority' },
        maxCommitTimeMS: 1000
      });
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a transaction conflict that we can retry
      const isRetryableError = error.code === 251 || // NoSuchTransaction
                              error.code === 112 || // WriteConflict
                              error.code === 244 || // TransactionTooOld
                              error.errorLabels?.includes('TransientTransactionError');
      
      if (isRetryableError && attempt < maxRetries) {
        console.log(`Transaction attempt ${attempt} failed, retrying...`, error.message);
        // Wait a bit before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        continue;
      }
      
      throw error;
    } finally {
      await session.endSession();
    }
  }
  
  throw lastError;
}

export interface MonetizedContent {
  type: 'public' | 'monetized';
  price?: number;
  paidUsers: string[];
}

export function validateMonetizedContent(content: MonetizedContent) {
  if (!['public', 'monetized'].includes(content?.type)) {
    throw new Error('Type must be either "public" or "monetized"');
  }

  if (content?.type === 'monetized' && (!content.price || typeof content.price !== 'number' || content.price <= 0)) {
    throw new Error('Price is required for monetized content and must be greater than 0');
  }
}

export function createAccessResponse(
  content: any,
  isMonetized: boolean,
  userId?: string
) {
  // Check if user is the owner
  const isOwner = userId && content.owner && content.owner._id.toString() === userId;

  // Owner or paid users can access
  if (isOwner || !isMonetized || (userId && content.paidUsers.some((paidUserId: any) => paidUserId.toString() === userId))) {
    return {
      link: content,
      canAccess: true,
      requiresPayment: false,
      ...(isMonetized && !isOwner && { alreadyPaid: true }),
      ...(isOwner && { isOwner: true })
    };
  }

  const limitedInfo = {
    _id: content._id,
    title: content.title,
    description: content.description,
    type: content?.type,
    price: content.price,
    owner: content.owner,
    item: content.item ? {
      name: content.item.name,
      type: content.item?.type,
      size: content.item.size
    } : undefined
  };

  return {
    link: limitedInfo,
    canAccess: false,
    requiresPayment: true,
    requiresAuth: !userId
  };
} 