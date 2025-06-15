import { Listing } from '@/app/lib/models';
import connectDB from '@/app/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();
    
    // Get all unique tags from active listings
    const tags = await Listing.aggregate([
      { $match: { status: 'active' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, tag: '$_id', count: 1 } }
    ]);
    
    return NextResponse.json(tags.map(t => t.tag));
  } catch (error: any) {
    console.error('GET /api/listings/tags error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 