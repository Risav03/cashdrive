import { generateAndSaveContent, searchUserContent } from '@/app/lib/ai/aiService';
import { chatCompletion, ChatMessage } from '@/app/lib/ai/openaiClient';
import { authOptions } from '@/app/lib/backend/authConfig';
import { Transaction } from '@/app/lib/models';
import { SharedLink } from '@/app/models/SharedLink';
import connectDB from '@/app/lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

// Constants
const LIMITS = {
  SEARCH_RESULTS: 8,
  CONTENT_PREVIEW: 500,
  TITLE_WORD_LIMIT: 8,
  TITLE_LENGTH_THRESHOLD: 100,
} as const;

const DEFAULTS = {
  CONTENT_TYPE: 'article',
  TEMPERATURE: 0.7,
} as const;

const MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
  PROMPT_REQUIRED: 'Prompt is required',
  GENERATION_ERROR: 'Failed to generate content',
} as const;

const SOURCE_TYPES = {
  USER_UPLOAD: 'user_upload',
  MARKETPLACE_PURCHASE: 'marketplace_purchase',
  SHARED_LINK: 'shared_link',
} as const;

const LOG_MESSAGES = {
  SELLER_INFO_ERROR: 'Error fetching seller info:',
  SHARER_INFO_ERROR: 'Error fetching sharer info:',
  GENERATION_ERROR: 'Content generation error:',
} as const;

const SYSTEM_PROMPTS = {
  CONTENT_WRITER: (contentType: ContentType) => `You are a professional content writer. Create high-quality ${contentType} content based on the user's request and provided context.`,
  CONTEXT_SECTION: (contextContent: string) => `\n\nContext from user's files:\n${contextContent}\n`,
  INSTRUCTIONS: `
Instructions:
- Create well-structured, professional content
- Use the context naturally and cite sources when relevant
- Include proper headings and formatting
- Make the content engaging and informative
- Ensure the content is substantial and valuable
- Format with markdown-style headers (# ## ###)`,
  CONTENT_TYPE_LABEL: (contentType: ContentType) => `\nContent Type: ${contentType}`,
  SUGGESTED_TITLE_LABEL: (title: string) => `\nSuggested Title: ${title}`,
} as const;

const AI_RESPONSES = {
  GENERATION_SUCCESS_MESSAGE: (title: string) => `Generated "${title}" and saved to your AI Generated folder`,
  DEFAULT_CONTENT_TITLE: 'Generated Content',
} as const;

// Types
type ContentType = 'article' | 'report' | 'summary' | 'essay';
type SourceType = typeof SOURCE_TYPES[keyof typeof SOURCE_TYPES];

interface GenerationRequest {
  prompt: string;
  contentType?: ContentType;
  title?: string;
  sourceQuery?: string;
  preview?: boolean;
}

interface SourceInfo {
  name: string;
  source: SourceType;
  relevanceScore: number;
  originalSeller?: string;
  sharedBy?: string;
}

interface GeneratedContent {
  title: string;
  content: string;
}

interface PreviewResponse {
  title: string;
  content: string;
  wordCount: number;
  sourcesUsed: SourceInfo[];
  isPreview: boolean;
}

interface GenerationResponse {
  success: boolean;
  file: {
    id: string;
    name: string;
    size: number;
    url: string;
  };
  content: {
    title: string;
    wordCount: number;
    preview: string;
  };
  sourcesUsed: SourceInfo[];
  message: string;
}

// Helper functions
const calculateWordCount = (text: string): number => text.split(/\s+/).length;

const truncateContent = (content: string, limit: number = LIMITS.CONTENT_PREVIEW): string => 
  content.length > limit ? `${content.substring(0, limit)}...` : content;

const formatRelevanceScore = (score: number): number => Math.round(score * 100);

const capitalizeWords = (text: string): string => 
  text.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');

const createContextSeparator = (): string => '\n\n---\n\n';

const formatContextEntry = (itemName: string, chunkText: string): string => 
  `From ${itemName}:\n${chunkText}`;

// Source information retrieval
async function getSellerInfo(itemId: string): Promise<string | undefined> {
  try {
    const transaction = await Transaction.findOne({
      item: itemId,
      status: 'completed'
    }).populate('seller', 'name');
    
    return transaction?.seller?.name;
  } catch (error) {
    console.error(LOG_MESSAGES.SELLER_INFO_ERROR, error);
    return undefined;
  }
}

async function getSharerInfo(itemId: string): Promise<string | undefined> {
  try {
    const sharedLink = await SharedLink.findOne({
      item: itemId,
      isActive: true
    }).populate('owner', 'name');
    
    return sharedLink?.owner?.name;
  } catch (error) {
    console.error(LOG_MESSAGES.SHARER_INFO_ERROR, error);
    return undefined;
  }
}

async function enrichSourceInfo(result: any): Promise<SourceInfo> {
  const baseInfo: SourceInfo = {
    name: result.item.name,
    source: result.item.contentSource || SOURCE_TYPES.USER_UPLOAD,
    relevanceScore: formatRelevanceScore(result.score),
  };

  switch (baseInfo.source) {
    case SOURCE_TYPES.MARKETPLACE_PURCHASE: {
      const sellerName = await getSellerInfo(result.item._id);
      if (sellerName) {
        baseInfo.originalSeller = sellerName;
      }
      break;
    }
    case SOURCE_TYPES.SHARED_LINK: {
      const sharerName = await getSharerInfo(result.item._id);
      if (sharerName) {
        baseInfo.sharedBy = sharerName;
      }
      break;
    }
  }

  return baseInfo;
}

async function buildSourcesInfo(sourceQuery: string | undefined, userId: string): Promise<SourceInfo[]> {
  if (!sourceQuery) return [];

  const searchResults = await searchUserContent(sourceQuery, userId, LIMITS.SEARCH_RESULTS);
  return Promise.all(searchResults.map(enrichSourceInfo));
}

// Content generation helpers
async function getContextContent(sourceQuery: string, userId: string): Promise<string> {
  const searchResults = await searchUserContent(sourceQuery, userId, LIMITS.SEARCH_RESULTS);
  
  if (searchResults.length === 0) return '';

  return searchResults
    .map(result => formatContextEntry(result.item.name, result.chunk.text))
    .join(createContextSeparator());
}

function buildSystemPrompt(
  contentType: ContentType, 
  contextContent: string, 
  suggestedTitle?: string
): string {
  let prompt = SYSTEM_PROMPTS.CONTENT_WRITER(contentType);

  if (contextContent) {
    prompt += SYSTEM_PROMPTS.CONTEXT_SECTION(contextContent);
  }

  prompt += SYSTEM_PROMPTS.INSTRUCTIONS;
  prompt += SYSTEM_PROMPTS.CONTENT_TYPE_LABEL(contentType);

  if (suggestedTitle) {
    prompt += SYSTEM_PROMPTS.SUGGESTED_TITLE_LABEL(suggestedTitle);
  }

  return prompt;
}

function extractTitleFromContent(content: string): string | null {
  // Try to find a markdown header
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  // Fallback to first line if it looks like a title
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return null;

  const firstLine = lines[0].trim();
  const isLikelyTitle = firstLine.length < LIMITS.TITLE_LENGTH_THRESHOLD && !firstLine.endsWith('.');
  
  return isLikelyTitle ? firstLine.replace(/^#+\s*/, '') : null;
}

function generateTitleFromPrompt(prompt: string): string {
  const words = prompt.split(' ').slice(0, LIMITS.TITLE_WORD_LIMIT);
  return capitalizeWords(words.join(' '));
}

function determineTitle(content: string, suggestedTitle?: string, prompt?: string): string {
  return suggestedTitle || 
         extractTitleFromContent(content) || 
         (prompt ? generateTitleFromPrompt(prompt) : AI_RESPONSES.DEFAULT_CONTENT_TITLE);
}

async function generateContentWithContext(
  prompt: string,
  contextContent: string,
  contentType: ContentType,
  suggestedTitle?: string
): Promise<GeneratedContent> {
  const systemPrompt = buildSystemPrompt(contentType, contextContent, suggestedTitle);
  
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ];

  const response = await chatCompletion(messages, undefined, DEFAULTS.TEMPERATURE);
  const content = response.choices[0].message.content || '';
  const title = determineTitle(content, suggestedTitle, prompt);

  return { title, content };
}

// Main request handlers
async function handlePreviewGeneration(
  request: GenerationRequest,
  sourcesUsed: SourceInfo[],
  userId: string
): Promise<PreviewResponse> {
  const contextContent = request.sourceQuery ? 
    await getContextContent(request.sourceQuery, userId) : '';

  const generatedContent = await generateContentWithContext(
    request.prompt,
    contextContent,
    request.contentType || DEFAULTS.CONTENT_TYPE,
    request.title
  );

  return {
    title: generatedContent.title,
    content: generatedContent.content,
    wordCount: calculateWordCount(generatedContent.content),
    sourcesUsed,
    isPreview: true,
  };
}

async function handleActualGeneration(
  request: GenerationRequest,
  sourcesUsed: SourceInfo[],
  userId: string,
  userName?: string
): Promise<GenerationResponse> {
  const result = await generateAndSaveContent({
    prompt: request.prompt,
    contentType: request.contentType || DEFAULTS.CONTENT_TYPE,
    title: request.title,
    sourceQuery: request.sourceQuery,
    userId,
    userDisplayName: userName,
  });

  return {
    success: true,
    file: {
      id: result.item._id,
      name: result.item.name,
      size: result.item.size,
      url: result.uploadResult.url,
    },
    content: {
      title: result.content.title,
      wordCount: result.content.wordCount,
      preview: truncateContent(result.content.content),
    },
    sourcesUsed,
    message: AI_RESPONSES.GENERATION_SUCCESS_MESSAGE(result.content.title),
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    await connectDB();
    const request: GenerationRequest = await req.json();

    if (!request.prompt) {
      return NextResponse.json({ error: MESSAGES.PROMPT_REQUIRED }, { status: 400 });
    }

    const sourcesUsed = await buildSourcesInfo(request.sourceQuery, session.user.id);

    if (request.preview) {
      const response = await handlePreviewGeneration(request, sourcesUsed, session.user.id);
      return NextResponse.json(response);
    } else {
      const response = await handleActualGeneration(
        request, 
        sourcesUsed, 
        session.user.id, 
        session.user.name || undefined
      );
      return NextResponse.json(response);
    }

  } catch (error) {
    console.error(LOG_MESSAGES.GENERATION_ERROR, error);
    return NextResponse.json(
      { error: MESSAGES.GENERATION_ERROR },
      { status: 500 }
    );
  }
} 