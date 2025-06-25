import { generateEmbedding } from '@/app/lib/ai/openaiClient';
import { authOptions } from '@/app/lib/backend/authConfig';
import { Listing, Transaction } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

// Constants
const SCORING_WEIGHTS = {
  EXACT_TITLE_MATCH: 50,
  EXACT_KEYWORD_MATCH: 40,
  SEMANTIC_SIMILARITY: 30,
  PARTIAL_KEYWORD_MATCH: 20,
  CONTENT_TYPE_MATCH: 15,
  TITLE_SIMILARITY: 10,
  POPULARITY_CAP: 3,
} as const;

const THRESHOLDS = {
  SEMANTIC_SIMILARITY: 0.5, // Lowered to catch more relevant content
  SEMANTIC_HIGH_CONFIDENCE: 0.75, // Higher tier for very relevant content
  RELEVANCE_MINIMUM: 10, // Lowered to include more potentially relevant items
  TITLE_SIMILARITY: 0.3,
  POPULARITY_VIEWS: 10,
  POPULARITY_DIVISOR: 200, // Reduced popularity impact
} as const;

const DEFAULT_VALUES = {
  MAX_RESULTS: 5,
} as const;

const MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
  QUERY_REQUIRED: 'Query is required',
  DISCOVERY_ERROR: 'Failed to discover relevant content',
} as const;

const NO_RESULTS_SUGGESTIONS = [
  'Try broadening your search terms',
  'Consider different content types',
  'Check for spelling variations',
] as const;

const CONTENT_TYPE_MAP: Record<string, string[]> = {
  article: ['pdf', 'doc', 'text', 'article', 'blog', 'essay'],
  report: ['pdf', 'doc', 'report', 'analysis', 'research'],
  presentation: ['ppt', 'presentation', 'slides'],
  guide: ['pdf', 'doc', 'guide', 'tutorial', 'how-to'],
  template: ['doc', 'template', 'format', 'structure'],
} as const;

const LOG_MESSAGES = {
  API_ERROR: 'Discovery API error:',
} as const;

// Interfaces
interface DiscoveryRequest {
  query: string;
  contentType?: string;
  suggestedTitle?: string;
  maxResults?: number;
}

interface RelevantListing {
  listing: FormattedListing;
  relevanceScore: number;
  matchReason: string;
}

interface FormattedListing {
  _id: string;
  title: string;
  description: string;
  price: number;
  tags: string[];
  views: number;
  seller: any;
  item: {
    name: string;
    type: string;
    mimeType: string;
  };
}

interface ScoringContext {
  query: string;
  queryEmbedding: number[];
  contentType?: string;
  suggestedTitle?: string;
}

interface ScoringResult {
  score: number;
  reasons: string[];
}

// Helper functions
const normalizeText = (text: string): string => text.toLowerCase();
const splitText = (text: string): string[] => text.split(/\s+/);
const normalizeAndSplit = (text: string): string[] => splitText(normalizeText(text));

const formatListing = (listing: any): FormattedListing => ({
  _id: listing._id,
  title: listing.title,
  description: listing.description,
  price: listing.price,
  tags: listing.tags,
  views: listing.views,
  seller: listing.seller,
  item: {
    name: listing.item.name,
    type: listing.item?.type,
    mimeType: listing.item?.mimeType,
  },
});

const createCombinedText = (listing: any): string => 
  `${listing.title} ${listing.description} ${listing.tags.join(' ')}`;

const createListingWordArray = (listing: any): string[] => {
  const titleWords = normalizeAndSplit(listing.title);
  const descWords = normalizeAndSplit(listing.description);
  const tagWords = listing.tags.map(normalizeText);
  return [...titleWords, ...descWords, ...tagWords];
};

// Scoring functions
async function calculateSemanticScore(
  listing: any,
  context: ScoringContext
): Promise<ScoringResult> {
  const combinedText = createCombinedText(listing);
  const listingEmbedding = await generateEmbedding(combinedText);
  const similarity = cosineSimilarity(context.queryEmbedding, listingEmbedding);
  
  if (similarity > THRESHOLDS.SEMANTIC_HIGH_CONFIDENCE) {
    return {
      score: similarity * SCORING_WEIGHTS.SEMANTIC_SIMILARITY,
      reasons: ['High semantic match'],
    };
  } else if (similarity > THRESHOLDS.SEMANTIC_SIMILARITY) {
    return {
      score: similarity * SCORING_WEIGHTS.SEMANTIC_SIMILARITY * 0.7,
      reasons: ['Semantic match'],
    };
  }
  
  return { score: 0, reasons: [] };
}

function calculateKeywordScore(listing: any, context: ScoringContext): ScoringResult {
  const queryWords = normalizeAndSplit(context.query);
  const titleWords = normalizeAndSplit(listing.title);
  const descWords = normalizeAndSplit(listing.description);
  const tagWords = listing.tags.map(normalizeText);
  
  let score = 0;
  const reasons: string[] = [];
  
  // Check for exact matches in title (highest priority)
  const exactTitleMatches = queryWords.filter(queryWord =>
    titleWords.includes(queryWord)
  ).length;
  
  if (exactTitleMatches > 0) {
    score += (exactTitleMatches / queryWords.length) * SCORING_WEIGHTS.EXACT_TITLE_MATCH;
    reasons.push(`${exactTitleMatches} exact title matches`);
  }
  
  // Check for exact matches in description and tags
  const exactKeywordMatches = queryWords.filter(queryWord =>
    descWords.includes(queryWord) || tagWords.includes(queryWord)
  ).length;
  
  if (exactKeywordMatches > 0) {
    score += (exactKeywordMatches / queryWords.length) * SCORING_WEIGHTS.EXACT_KEYWORD_MATCH;
    reasons.push(`${exactKeywordMatches} exact keyword matches`);
  }
  
  // Check for partial matches (lower priority)
  const allWords = [...titleWords, ...descWords, ...tagWords];
  const partialMatches = queryWords.filter(queryWord =>
    allWords.some(word => word.includes(queryWord) && word !== queryWord)
  ).length;
  
  if (partialMatches > 0) {
    score += (partialMatches / queryWords.length) * SCORING_WEIGHTS.PARTIAL_KEYWORD_MATCH;
    reasons.push(`${partialMatches} partial matches`);
  }

  return { score, reasons };
}

function calculateContentTypeScore(listing: any, context: ScoringContext): ScoringResult {
  if (!context.contentType) {
    return { score: 0, reasons: [] };
  }

  const relevantTypes = CONTENT_TYPE_MAP[context.contentType.toLowerCase()] || [];
  const itemType = listing.item?.mimeType || '';
  const titleAndTags = normalizeText(`${listing.title} ${listing.tags.join(' ')}`);

  const hasTypeMatch = relevantTypes.some(type =>
    itemType.includes(type) || titleAndTags.includes(type)
  );

  if (hasTypeMatch) {
    return {
      score: SCORING_WEIGHTS.CONTENT_TYPE_MATCH,
      reasons: ['Content type match'],
    };
  }

  return { score: 0, reasons: [] };
}

function calculateTitleSimilarityScore(listing: any, context: ScoringContext): ScoringResult {
  if (!context.suggestedTitle) {
    return { score: 0, reasons: [] };
  }

  const similarity = calculateStringSimilarity(
    normalizeText(context.suggestedTitle),
    normalizeText(listing.title)
  );

  if (similarity > THRESHOLDS.TITLE_SIMILARITY) {
    return {
      score: similarity * SCORING_WEIGHTS.TITLE_SIMILARITY,
      reasons: ['Title similarity'],
    };
  }

  return { score: 0, reasons: [] };
}

function calculatePopularityScore(listing: any): ScoringResult {
  if (listing.views > THRESHOLDS.POPULARITY_VIEWS) {
    return {
      score: Math.min(listing.views / THRESHOLDS.POPULARITY_DIVISOR, SCORING_WEIGHTS.POPULARITY_CAP),
      reasons: ['Popular content'],
    };
  }

  return { score: 0, reasons: [] };
}

async function calculateRelevanceScore(
  listing: any,
  context: ScoringContext
): Promise<ScoringResult> {
  const scoringFunctions = [
    () => calculateSemanticScore(listing, context),
    () => Promise.resolve(calculateKeywordScore(listing, context)),
    () => Promise.resolve(calculateContentTypeScore(listing, context)),
    () => Promise.resolve(calculateTitleSimilarityScore(listing, context)),
    () => Promise.resolve(calculatePopularityScore(listing)),
  ];

  const results = await Promise.all(scoringFunctions.map(fn => fn()));
  
  return {
    score: results.reduce((total, result) => total + result.score, 0),
    reasons: results.flatMap(result => result.reasons),
  };
}

async function processListings(
  listings: any[],
  context: ScoringContext,
  maxResults: number
): Promise<RelevantListing[]> {
  const relevantListings: RelevantListing[] = [];

  for (const listing of listings) {
    const { score: relevanceScore, reasons: matchReasons } = await calculateRelevanceScore(listing, context);

    if (relevanceScore > THRESHOLDS.RELEVANCE_MINIMUM) {
      relevantListings.push({
        listing: formatListing(listing),
        relevanceScore,
        matchReason: matchReasons.join(', '),
      });
    }
  }

  return relevantListings
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    await connectDB();

    const { query, contentType, suggestedTitle, maxResults = DEFAULT_VALUES.MAX_RESULTS }: DiscoveryRequest = await request.json();

    if (!query?.trim()) {
      return NextResponse.json({ error: MESSAGES.QUERY_REQUIRED }, { status: 400 });
    }

    // Get query embedding for semantic similarity
    const queryEmbedding = await generateEmbedding(query);

    // Get user's purchased item IDs to exclude from results
    const userTransactions = await Transaction.find({
      buyer: session.user.id,
      status: 'completed'
    }).select('item');
    const purchasedItemIds = userTransactions.map((t: any) => t.item);

    // Fetch all active listings with items (excluding user's own listings and already purchased items)
    const listings = await Listing.find({ 
      status: 'active',
      seller: { $ne: session.user.id },
      item: { $nin: purchasedItemIds }
    }).populate('seller', 'name')
      .populate('item', 'name type mimeType');

    if (listings.length === 0) {
      return NextResponse.json({
        query,
        contentType,
        results: [],
        suggestions: NO_RESULTS_SUGGESTIONS,
        totalFound: 0
      });
    }

    // Create scoring context
    const context: ScoringContext = {
      query,
      queryEmbedding,
      contentType,
      suggestedTitle
    };

    // Process and score listings
    const relevantListings = await processListings(listings, context, maxResults);

    return NextResponse.json({
      query,
      contentType,
      results: relevantListings,
      suggestions: relevantListings.length > 0 ? [] : NO_RESULTS_SUGGESTIONS,
      totalFound: relevantListings.length
    });

  } catch (error) {
    console.error(LOG_MESSAGES.API_ERROR, error);
    return NextResponse.json(
      { error: MESSAGES.DISCOVERY_ERROR },
      { status: 500 }
    );
  }
}

// Mathematical helper functions
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + substitutionCost
      );
    }
  }
  
  return matrix[str2.length][str1.length];
} 