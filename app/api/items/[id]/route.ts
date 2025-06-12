import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import { Item } from '@/app/models/Item';
import { getUserRootFolder } from '@/app/lib/backend/helperFunctions/getUserRootFolder';

// Get item by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await getUserRootFolder(); // Just to verify authentication
    await connectDB();
    
    const item = await Item.findById(params.id);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 