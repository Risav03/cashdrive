import { authOptions } from '@/app/lib/backend/authConfig';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/User';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const dbSession = await mongoose.startSession();

    try {
      return await dbSession.withTransaction(async () => {
        const user = await User.findById(session.user.id)
          .select('-password')
          .session(dbSession);
        
        if (!user) {
          throw new Error('User not found');
        }

        return NextResponse.json({
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            rootFolder: user.rootFolder.toString(),
            createdAt: user.createdAt
          }
        });
      });
    } finally {
      await dbSession.endSession();
    }

  } catch (error: any) {
    console.error('GET /api/user error:', error);
    
    if (error.message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const dbSession = await mongoose.startSession();

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    try {
      return await dbSession.withTransaction(async () => {
        const user = await User.findOne({ email })
          .select('_id name email')
          .session(dbSession);
        
        if (!user) {
          throw new Error('User not found');
        }

        // Don't allow users to create affiliates for themselves
        if (user.email === session.user.email) {
          throw new Error('Cannot create affiliate for yourself');
        }

        return NextResponse.json({ user });
      });
    } finally {
      await dbSession.endSession();
    }

  } catch (error: any) {
    console.error('POST /api/user error:', error);
    
    if (error.message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (error.message === 'Cannot create affiliate for yourself') {
      return NextResponse.json({ error: 'Cannot create affiliate for yourself' }, { status: 400 });
    }
    
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
