import { Transaction } from '@/app/lib/models';
import { AIChunk } from '@/app/models/AIChunk';
import { Item } from '@/app/models/Item';
import { SharedLink } from '@/app/models/SharedLink';
import { downloadFileFromS3 } from '../s3';
import { generateEmbedding, generateEmbeddings } from './openaiClient';
import { processTextFile } from './textProcessor';

// Constants
const PROCESSABLE_MIME_TYPES = [
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

const PROCESSING_STATUS = {
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

const CONTENT_SOURCES = {
  USER_UPLOAD: 'user_upload',
  MARKETPLACE_PURCHASE: 'marketplace_purchase',
  SHARED_LINK: 'shared_link',
  AI_GENERATED: 'ai_generated',
} as const;

const THRESHOLDS = {
  SIMILARITY_THRESHOLD: 0.7,
  DEFAULT_SEARCH_LIMIT: 10,
  CONTEXT_SEARCH_LIMIT: 8,
  TITLE_WORD_LIMIT: 8,
} as const;

const FOLDERS = {
  AI_GENERATED: 'AI Generated',
} as const;

const GENERATION_DEFAULTS = {
  CONTENT_TYPE: 'article',
  TEMPERATURE: 0.7,
  AUTHOR_FALLBACK: 'AI Assistant',
} as const;

const ERROR_MESSAGES = {
  ITEM_NOT_FOUND: 'Item not found',
  USER_NOT_FOUND: 'User not found',
  SEARCH_FAILED: 'Failed to search content',
} as const;

const LOG_MESSAGES = {
  PROCESSING_FILE: 'Processing file for AI:',
  SUCCESSFULLY_PROCESSED: 'Successfully processed file:',
  PROCESSING_ERROR: 'Error processing file for AI:',
  SEARCH_ERROR: 'Error searching user content:',
  SKIPPING_NON_PROCESSABLE: 'Skipping non-processable file type:',
  PROCESSING_PDF: 'Processing PDF file:', 
  PDF_LIMITED_EXTRACTION: '(limited text extraction)',
} as const;

const SYSTEM_PROMPTS = {
  CONTENT_WRITER: (contentType: string) => `You are a professional content writer. Create high-quality ${contentType} content based on the user's request and provided context.`,
  CONTEXT_SECTION: (contextContent: string) => `\n\nContext from user's files:\n${contextContent}\n`,
  INSTRUCTIONS: `
Instructions:
- Create well-structured, professional content
- Use the context naturally and cite sources when relevant
- Include proper headings and formatting
- Make the content engaging and informative
- Ensure the content is substantial and valuable
- Format with markdown-style headers (# ## ###)`,
  CONTENT_TYPE_LABEL: (contentType: string) => `\nContent Type: ${contentType}`,
  SUGGESTED_TITLE_LABEL: (title: string) => `\nSuggested Title: ${title}`,
} as const;

const CONTEXT_FORMATTING = {
  SEPARATOR: '\n\n---\n\n',
  ENTRY_FORMAT: (itemName: string, chunkText: string) => `From ${itemName}:\n${chunkText}`,
} as const;

// Types
type ProcessingStatus = typeof PROCESSING_STATUS[keyof typeof PROCESSING_STATUS];
type ContentSource = typeof CONTENT_SOURCES[keyof typeof CONTENT_SOURCES];

interface ProcessingResult {
  status: ProcessingStatus;
  textContent?: string;
  processedAt?: Date;
  topics?: string[];
  chunksCount?: number;
}

interface SearchResult {
  item: {
    _id: string;
    name: string;
    mimeType: string;
    contentSource: ContentSource;
  };
  chunk: {
    text: string;
    chunkIndex: number;
  };
  score: number;
}

interface UserAccessQuery {
  $or: Array<{
    owner?: string;
    _id?: { $in: string[] };
    contentSource?: ContentSource;
  }>;
  'aiProcessing.status': ProcessingStatus;
  'aiProcessing.chunksCount'?: { $gt: number };
}

interface GenerationParams {
  prompt: string;
  contentType?: string;
  title?: string;
  sourceQuery?: string;
  userId: string;
  userDisplayName?: string;
}

interface GenerationResult {
  item: any;
  content: {
    title: string;
    content: string;
    wordCount: number;
  };
  uploadResult: any;
}

// Helper functions
const isProcessableFile = (mimeType: string): boolean => 
  PROCESSABLE_MIME_TYPES.includes(mimeType as any);

const isPdfFile = (mimeType: string): boolean => 
  mimeType === 'application/pdf';

const cosineSimilarity = (a: number[], b: number[]): number => {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

const generateFileName = (title: string): string => {
  const timestamp = new Date().toISOString().split('T')[0];
  const cleanTitle = title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  return `${cleanTitle}_${timestamp}.pdf`;
};

const calculateWordCount = (content: string): number => 
  content.split(/\s+/).length;

const capitalizeWords = (text: string): string => 
  text.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');

// Database query builders
async function getUserPurchasedItemIds(userId: string): Promise<string[]> {
  const userTransactions = await Transaction.find({
    buyer: userId,
    status: 'completed'
  }).select('item');
  
  return userTransactions.map(t => t.item);
}

async function getUserAccessibleSharedItemIds(userId: string): Promise<string[]> {
  const accessibleSharedLinks = await SharedLink.find({
    $or: [
      { paidUsers: userId },
      { type: 'public' }
    ],
    isActive: true
  }).select('item');
  
  return accessibleSharedLinks.map(sl => sl.item);
}

function buildUserAccessQuery(
  userId: string, 
  purchasedItemIds: string[], 
  sharedItemIds: string[],
  includeChunkCount = false
): UserAccessQuery {
  const query: UserAccessQuery = {
    $or: [
      { owner: userId },
      { 
        _id: { $in: purchasedItemIds },
        contentSource: CONTENT_SOURCES.MARKETPLACE_PURCHASE
      },
      {
        _id: { $in: sharedItemIds },
        contentSource: CONTENT_SOURCES.SHARED_LINK
      }
    ],
    'aiProcessing.status': PROCESSING_STATUS.COMPLETED
  };

  if (includeChunkCount) {
    query['aiProcessing.chunksCount'] = { $gt: 0 };
  }

  return query;
}

async function getUserAccessibleItems(userId: string, includeChunkCount = false): Promise<any[]> {
  const [purchasedItemIds, sharedItemIds] = await Promise.all([
    getUserPurchasedItemIds(userId),
    getUserAccessibleSharedItemIds(userId)
  ]);

  const query = buildUserAccessQuery(userId, purchasedItemIds, sharedItemIds, includeChunkCount);
  
  return Item.find(query);
}

// File processing functions
async function processAndStoreChunks(itemId: string, fileBuffer: Buffer, mimeType: string): Promise<ProcessingResult> {
  const processedText = await processTextFile(fileBuffer, mimeType);
  const embeddingResults = await generateEmbeddings(processedText.chunks);

  const chunkDocuments = embeddingResults.map((result, index) => ({
    item: itemId,
    text: result.text,
    embedding: result.embedding,
    chunkIndex: index
  }));

  // Clean existing chunks and insert new ones
  await AIChunk.deleteMany({ item: itemId });
  await AIChunk.insertMany(chunkDocuments);

  return {
    status: PROCESSING_STATUS.COMPLETED,
    textContent: processedText.content,
    processedAt: new Date(),
    topics: processedText.topics,
    chunksCount: embeddingResults.length
  };
}

async function updateItemProcessingStatus(itemId: string, processingResult: ProcessingResult): Promise<void> {
  await Item.findByIdAndUpdate(itemId, {
    aiProcessing: processingResult
  });
}

async function handleProcessingError(itemId: string, error: any): Promise<void> {
  await Item.findByIdAndUpdate(itemId, {
    'aiProcessing.status': PROCESSING_STATUS.FAILED
  });
  throw error;
}

// Search functions
function findBestChunkPerFile(results: SearchResult[]): SearchResult[] {
  const fileResults = new Map<string, SearchResult>();
  
  for (const result of results) {
    const fileId = result.item._id.toString();
    if (!fileResults.has(fileId) || result.score > fileResults.get(fileId)!.score) {
      fileResults.set(fileId, result);
    }
  }

  return Array.from(fileResults.values());
}

async function calculateSimilarityScores(
  queryEmbedding: number[], 
  items: any[]
): Promise<SearchResult[]> {
  const itemIds = items.map(item => item._id);
  const chunks = await AIChunk.find({ item: { $in: itemIds } });
  const results: SearchResult[] = [];

  for (const chunk of chunks) {
    const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
    
    if (similarity > THRESHOLDS.SIMILARITY_THRESHOLD) {
      const item = items.find(i => i._id.toString() === chunk.item.toString());
      
      if (item) {
        results.push({
          item: {
            _id: item._id,
            name: item.name,
            mimeType: item?.mimeType,
            contentSource: item.contentSource || CONTENT_SOURCES.USER_UPLOAD
          },
          chunk: {
            text: chunk.text,
            chunkIndex: chunk.chunkIndex
          },
          score: similarity
        });
      }
    }
  }

  return results;
}

// Content generation helpers
function extractTitleFromContent(content: string): string | null {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : null;
}

function generateTitleFromPrompt(prompt: string): string {
  const words = prompt.split(' ').slice(0, THRESHOLDS.TITLE_WORD_LIMIT);
  return capitalizeWords(words.join(' '));
}

function determineFinalTitle(content: string, suggestedTitle?: string, prompt?: string): string {
  return suggestedTitle || 
         extractTitleFromContent(content) || 
         (prompt ? generateTitleFromPrompt(prompt) : 'Generated Content');
}

function buildSystemPrompt(contentType: string, contextContent: string, title?: string): string {
  let prompt = SYSTEM_PROMPTS.CONTENT_WRITER(contentType);

  if (contextContent) {
    prompt += SYSTEM_PROMPTS.CONTEXT_SECTION(contextContent);
  }

  prompt += SYSTEM_PROMPTS.INSTRUCTIONS;
  prompt += SYSTEM_PROMPTS.CONTENT_TYPE_LABEL(contentType);

  if (title) {
    prompt += SYSTEM_PROMPTS.SUGGESTED_TITLE_LABEL(title);
  }

  return prompt;
}

async function buildContextContent(sourceQuery: string, userId: string): Promise<{ content: string; sourceFileIds: string[] }> {
  const searchResults = await searchUserContent(sourceQuery, userId, THRESHOLDS.CONTEXT_SEARCH_LIMIT);
  
  if (searchResults.length === 0) {
    return { content: '', sourceFileIds: [] };
  }

  const content = searchResults
    .map(result => CONTEXT_FORMATTING.ENTRY_FORMAT(result.item.name, result.chunk.text))
    .join(CONTEXT_FORMATTING.SEPARATOR);
    
  const sourceFileIds = searchResults.map(result => result.item._id);

  return { content, sourceFileIds };
}

// Main exported functions
export async function processFileForAI(itemId: string): Promise<void> {
  try {
    console.log(LOG_MESSAGES.PROCESSING_FILE, itemId);
    
    const item = await Item.findById(itemId);
    if (!item) {
      throw new Error(ERROR_MESSAGES.ITEM_NOT_FOUND);
    }

    if (!isProcessableFile(item?.mimeType)) {
      console.log(`${LOG_MESSAGES.SKIPPING_NON_PROCESSABLE} ${item?.mimeType}`);
      return;
    }

    if (isPdfFile(item?.mimeType)) {
      console.log(`${LOG_MESSAGES.PROCESSING_PDF} ${item.name} ${LOG_MESSAGES.PDF_LIMITED_EXTRACTION}`);
    }

    // Update status to processing
    await Item.findByIdAndUpdate(itemId, {
      'aiProcessing.status': PROCESSING_STATUS.PROCESSING
    });

    // Download and process file using S3 service
    const fileBuffer = await downloadFileFromS3(item.url);
    const processingResult = await processAndStoreChunks(itemId, fileBuffer, item?.mimeType);
    
    // Update item with results
    await updateItemProcessingStatus(itemId, processingResult);
    
    console.log(`${LOG_MESSAGES.SUCCESSFULLY_PROCESSED} ${item.name}`);

  } catch (error) {
    console.error(LOG_MESSAGES.PROCESSING_ERROR, error);
    await handleProcessingError(itemId, error);
  }
}

export async function searchUserContent(
  query: string, 
  userId: string, 
  limit: number = THRESHOLDS.DEFAULT_SEARCH_LIMIT
): Promise<SearchResult[]> {
  try {
    const queryEmbedding = await generateEmbedding(query);
    const items = await getUserAccessibleItems(userId, true);
    const allResults = await calculateSimilarityScores(queryEmbedding, items);
    const bestResults = findBestChunkPerFile(allResults);

    return bestResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

  } catch (error) {
    console.error(LOG_MESSAGES.SEARCH_ERROR, error);
    throw new Error(ERROR_MESSAGES.SEARCH_FAILED);
  }
}

export async function getProcessedFiles(userId: string) {
  const items = await getUserAccessibleItems(userId);
  
  return items.map(item => ({
    ...item.toObject(),
    // Only include necessary fields
    name: item.name,
    aiProcessing: item.aiProcessing,
    mimeType: item?.mimeType,
    contentSource: item.contentSource
  }));
}

export async function ensureAIGeneratedFolder(userId: string) {
  const User = (await import('@/app/models/User')).default;
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  let aiFolder = await Item.findOne({
    name: FOLDERS.AI_GENERATED,
    type: "folder",
    parentId: user.rootFolder,
    owner: userId
  });

  if (!aiFolder) {
    aiFolder = await Item.create({
      name: FOLDERS.AI_GENERATED,
      type: "folder", 
      parentId: user.rootFolder,
      owner: userId
    });
  }

  return aiFolder;
}

export async function generateAndSaveContent(params: GenerationParams): Promise<GenerationResult> {
  const { chatCompletion } = await import('./openaiClient');
  const { generatePDF } = await import('./pdfGenerator');
  const { uploadFileToS3 } = await import('../s3');
  const { Item } = await import('../../models/Item');

  // Build context content if source query provided
  const { content: contextContent, sourceFileIds } = params.sourceQuery 
    ? await buildContextContent(params.sourceQuery, params.userId)
    : { content: '', sourceFileIds: [] };

  // Generate content using AI
  const systemPrompt = buildSystemPrompt(
    params.contentType || GENERATION_DEFAULTS.CONTENT_TYPE,
    contextContent,
    params.title
  );

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: params.prompt }
  ];

  const response = await chatCompletion(messages, undefined, GENERATION_DEFAULTS.TEMPERATURE);
  const content = response.choices[0].message.content || '';

  // Determine final title
  const finalTitle = determineFinalTitle(content, params.title, params.prompt);

  // Create AI Generated folder if it doesn't exist
  const aiFolder = await ensureAIGeneratedFolder(params.userId);

  // Generate filename and PDF
  const fileName = generateFileName(finalTitle);
  const pdfBuffer = await generatePDF({
    title: finalTitle,
    content: content,
    author: params.userDisplayName || GENERATION_DEFAULTS.AUTHOR_FALLBACK
  });

  // Upload to S3
  const arrayBuffer = new Uint8Array(pdfBuffer).buffer;
  const pdfFile = new File([arrayBuffer], fileName, { type: 'application/pdf' });
  const uploadResult = await uploadFileToS3(pdfFile, fileName, params.userId);

  // Save as Item in MongoDB
  const newItem = await Item.create({
    name: fileName,
    type: 'file',
    parentId: aiFolder._id,
    owner: params.userId,
    url: uploadResult.url,
    size: pdfBuffer.length,
    mimeType: 'application/pdf',
    contentSource: CONTENT_SOURCES.AI_GENERATED,
    aiGeneration: {
      sourcePrompt: params.prompt,
      sourceFiles: sourceFileIds,
      generatedAt: new Date()
    }
  });

  return {
    item: newItem,
    content: {
      title: finalTitle,
      content,
      wordCount: calculateWordCount(content)
    },
    uploadResult
  };
} 