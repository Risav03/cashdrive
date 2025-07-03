import { authOptions } from '@/app/lib/backend/authConfig';
import connectDB from '@/app/lib/mongodb';
import { Item } from '@/app/models/Item';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

// Constants
const ITEM_TYPES = {
  FILE: 'file',
} as const;

const AI_STATUS_TYPES = {
  NONE: 'none',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

const GENERATED_BY_TYPES = {
  AI: 'ai',
} as const;

const MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
  STATS_ERROR: 'Failed to fetch stats',
} as const;

const LOG_MESSAGES = {
  FILES_FOUND: 'All files found:',
  FORMATTED_STATS: 'Formatted stats:',
  API_ERROR: 'Stats API error:',
} as const;

const DATABASE_FIELDS = {
  AI_PROCESSING_STATUS: 'aiProcessing.status',
  OWNER: 'owner',
  TYPE: 'type',
  GENERATED_BY: 'generatedBy',
} as const;

// Types
type AIProcessingStatus = typeof AI_STATUS_TYPES[keyof typeof AI_STATUS_TYPES];

interface FileStatsQuery {
  owner: string;
  type: string;
}

interface GeneratedContentQuery {
  owner: string;
  generatedBy: string;
}

interface ProcessingStatusStats {
  [key: string]: number;
}

interface AIStatsResponse extends ProcessingStatusStats {
  generated: number;
}

// Helper functions
const createFileStatsQuery = (userId: string): FileStatsQuery => ({
  [DATABASE_FIELDS.OWNER]: userId,
  [DATABASE_FIELDS.TYPE]: ITEM_TYPES.FILE,
});

const createGeneratedContentQuery = (userId: string): GeneratedContentQuery => ({
  [DATABASE_FIELDS.OWNER]: userId,
  [DATABASE_FIELDS.GENERATED_BY]: GENERATED_BY_TYPES.AI,
});

const getProcessingStatus = (file: any): AIProcessingStatus => 
  file.aiProcessing?.status || AI_STATUS_TYPES.NONE;

const calculateProcessingStats = (files: any[]): ProcessingStatusStats => {
  return files.reduce((accumulator, file) => {
    const status = getProcessingStatus(file);
    accumulator[status] = (accumulator[status] || 0) + 1;
    return accumulator;
  }, {} as ProcessingStatusStats);
};

// Data fetching functions
async function fetchUserFiles(userId: string): Promise<any[]> {
  const query = createFileStatsQuery(userId);
  const files = await Item.find(query).select(DATABASE_FIELDS.AI_PROCESSING_STATUS);
  
  console.log(LOG_MESSAGES.FILES_FOUND, files.length);
  return files;
}

async function fetchGeneratedContentCount(userId: string): Promise<number> {
  const query = createGeneratedContentQuery(userId);
  return Item.countDocuments(query);
}

// Main stats calculation
async function calculateAIStats(userId: string): Promise<AIStatsResponse> {
  const [userFiles, generatedCount] = await Promise.all([
    fetchUserFiles(userId),
    fetchGeneratedContentCount(userId),
  ]);

  const processingStats = calculateProcessingStats(userFiles);
  
  console.log(LOG_MESSAGES.FORMATTED_STATS, processingStats);

  return {
    ...processingStats,
    generated: generatedCount,
  };
}

// Request handler
async function handleStatsRequest(userId: string): Promise<AIStatsResponse> {
  await connectDB();
  return calculateAIStats(userId);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const stats = await handleStatsRequest(session.user.id);
    return NextResponse.json(stats);

  } catch (error) {
    console.error(LOG_MESSAGES.API_ERROR, error);
    return NextResponse.json(
      { error: MESSAGES.STATS_ERROR },
      { status: 500 }
    );
  }
} 