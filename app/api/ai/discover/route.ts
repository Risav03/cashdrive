import { generateEmbedding } from '@/app/lib/ai/openaiClient';
import { authOptions } from '@/app/lib/backend/authConfig';
import { Listing } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

interface DiscoveryRequest {
  query: string;
  contentType?: string;
  suggestedTitle?: string;
  maxResults?: number;
}

interface RelevantListing {
  listing: any;
  relevanceScore: number;
  matchReason: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body: DiscoveryRequest = await request.json();
    const { query, contentType, suggestedTitle, maxResults = 5 } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Get all active listings
    const listings = await Listing.find({ status: 'active' })
      .populate('item', 'name type mimeType')
      .populate('seller', 'name')
      .lean();

    // Generate embedding for the user's query
    const queryEmbedding = await generateEmbedding(query);

    const relevantListings: RelevantListing[] = [];

    // Score each listing for relevance
    for (const listing of listings) {
      let relevanceScore = 0;
      const matchReasons: string[] = [];

      // 1. Text similarity scoring
      const combinedText = `${listing.title} ${listing.description} ${listing.tags.join(' ')}`;
      const listingEmbedding = await generateEmbedding(combinedText);
      const semanticSimilarity = cosineSimilarity(queryEmbedding, listingEmbedding);
      
      if (semanticSimilarity > 0.7) {
        relevanceScore += semanticSimilarity * 40; // High weight for semantic similarity
        matchReasons.push('Semantic match');
      }

      // 2. Keyword matching
      const queryWords = query.toLowerCase().split(/\s+/);
      const titleWords = listing.title.toLowerCase().split(/\s+/);
      const descWords = listing.description.toLowerCase().split(/\s+/);
      const allWords = [...titleWords, ...descWords, ...listing.tags.map((t: string) => t.toLowerCase())];

      let keywordMatches = 0;
      for (const queryWord of queryWords) {
        if (allWords.some(word => word.includes(queryWord) || queryWord.includes(word))) {
          keywordMatches++;
        }
      }
      
      if (keywordMatches > 0) {
        relevanceScore += (keywordMatches / queryWords.length) * 20;
        matchReasons.push(`${keywordMatches} keyword matches`);
      }

      // 3. Content type matching
      if (contentType) {
        const contentTypeMap: Record<string, string[]> = {
          'article': ['pdf', 'doc', 'text', 'article', 'blog', 'essay'],
          'report': ['pdf', 'doc', 'report', 'analysis', 'research'],
          'presentation': ['ppt', 'presentation', 'slides'],
          'guide': ['pdf', 'doc', 'guide', 'tutorial', 'how-to'],
          'template': ['doc', 'template', 'format', 'structure']
        };

        const relevantTypes = contentTypeMap[contentType.toLowerCase()] || [];
        const itemType = listing.item.mimeType || '';
        const titleAndTags = `${listing.title} ${listing.tags.join(' ')}`.toLowerCase();

        if (relevantTypes.some(type => 
          itemType.includes(type) || titleAndTags.includes(type)
        )) {
          relevanceScore += 15;
          matchReasons.push('Content type match');
        }
      }

      // 4. Title similarity (if provided)
      if (suggestedTitle) {
        const titleSimilarity = calculateStringSimilarity(
          suggestedTitle.toLowerCase(), 
          listing.title.toLowerCase()
        );
        if (titleSimilarity > 0.3) {
          relevanceScore += titleSimilarity * 10;
          matchReasons.push('Title similarity');
        }
      }

      // 5. Popularity boost
      if (listing.views > 10) {
        relevanceScore += Math.min(listing.views / 100, 5); // Cap at 5 points
        matchReasons.push('Popular content');
      }

      // Only include if above threshold
      if (relevanceScore > 15) {
        relevantListings.push({
          listing: {
            _id: listing._id,
            title: listing.title,
            description: listing.description,
            price: listing.price,
            tags: listing.tags,
            views: listing.views,
            seller: listing.seller,
            item: {
              name: listing.item.name,
              type: listing.item.type,
              mimeType: listing.item.mimeType
            }
          },
          relevanceScore,
          matchReason: matchReasons.join(', ')
        });
      }
    }

    // Sort by relevance score and return top results
    const sortedResults = relevantListings
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);

    return NextResponse.json({
      query,
      contentType,
      totalFound: relevantListings.length,
      results: sortedResults,
      suggestions: sortedResults.length === 0 ? [
        'Try broadening your search terms',
        'Consider different content types',
        'Check for spelling variations'
      ] : []
    });

  } catch (error: any) {
    console.error('Discovery API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to discover relevant content' 
    }, { status: 500 });
  }
}

// Helper functions
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