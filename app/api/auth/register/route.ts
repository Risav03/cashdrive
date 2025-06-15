import connectDB from '@/app/lib/mongodb';
import { Item } from '@/app/models/Item';
import User from '@/app/models/User';
import { NextRequest, NextResponse } from 'next/server';

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

    console.log("Creating account");
    const cdp = new CdpClient();

    const account = await cdp.evm.createAccount();

    console.log("Account created");

    // Create new user instance (but don't save yet)
    const user = new User({
      name,
      email,
      password,
      wallet: account.address
    });

    // Create root folder for the user with ownership
    const rootFolder = await Item.create({
      name: email,
      type: 'folder',
      parentId: null,
      owner: user._id
    });

    // Set root folder reference and save user
    user.rootFolder = rootFolder._id;
    await user.save();

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