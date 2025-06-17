import { authOptions } from '@/app/lib/backend/authConfig';
import connectDB from '@/app/lib/mongodb';
import { Item } from '@/app/models/Item';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const allFiles = await Item.find({
      owner: session.user.id,
      type: 'file'
    }).select('aiProcessing.status');

    console.log('All files found:', allFiles.length);

    const stats = allFiles.reduce((acc, file) => {
      const status = file.aiProcessing?.status || 'none';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Formatted stats:', stats);

    const generatedCount = await Item.countDocuments({
      owner: session.user.id,
      generatedBy: 'ai'
    });

    return NextResponse.json({
      ...stats,
      generated: generatedCount
    });

  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
} 