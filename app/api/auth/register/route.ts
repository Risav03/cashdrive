import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { Item } from '@/app/models/Item';

import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";

import { revalidatePath } from 'next/cache';


export async function POST(req: NextRequest) {
  try {
    revalidatePath("/", "layout");
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

    dotenv.config();

    const cdp = new CdpClient();
    const account = await cdp.evm.createAccount();

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
      rootFolder: rootFolder._id,
      wallet: account.address
    });

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          rootFolder: rootFolder._id,
          wallet: user.wallet
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