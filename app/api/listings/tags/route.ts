import { Listing } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

let tagsCache: string[] | null = null;
let lastCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const now = Date.now();
    if (tagsCache && (now - lastCacheTime) < CACHE_DURATION) {
      return NextResponse.json(tagsCache);
    }

    await connectDB();
    
    const tags = await Listing.aggregate([
      { $match: { 
        status: 'active',
        tags: { $exists: true, $ne: [] }
      }},
      // Unwind tags array
      { $group: { 
        _id: '$tags', 
        count: { $sum: 1 } 
      }},
      { $match: { 
        count: { $gt: 1 } 
      }},
      { $sort: { count: -1 } },
      { $limit: 100 },
      { $project: { 
        _id: 0, 
        tag: '$_id'
      }}
    ]).exec();

    tagsCache = tags.map(t => t.tag);
    lastCacheTime = now;
    
    return NextResponse.json(tagsCache);
  } catch (error: any) {
    console.error('GET /api/listings/tags error:', error);
    if (tagsCache) {
      console.warn('Returning cached tags due to error');
      return NextResponse.json(tagsCache);
    }
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
} 