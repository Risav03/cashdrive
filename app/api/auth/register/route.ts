import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { Item } from '@/app/models/Item';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Create root folder for the user
    const rootFolder = await Item.create({
      name: email,
      type: 'folder',
      parentId: null,
    });

    // Create new user with root folder reference
    const user = await User.create({
      name,
      email,
      password,
      rootFolder: rootFolder._id
    });

    return NextResponse.json(
      { 
        message: 'User created successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          rootFolder: rootFolder._id
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 