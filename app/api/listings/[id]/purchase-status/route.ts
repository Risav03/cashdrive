import { Transaction } from "@/app/models/Transaction";
import connectDB from "@/app/lib/mongodb";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/lib/backend/authConfig";
import { Types } from "mongoose";

const isValidObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();
    const params = await context.params;
    const { id } = params;

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid listing ID" },
        { status: 400 }
      );
    }

    // Check if user has a completed transaction for this listing
    const transaction = await Transaction.findOne({
      listing: id,
      buyer: session.user.id,
      status: 'completed'
    });

    return NextResponse.json({
      hasPurchased: !!transaction,
      transaction: transaction ? {
        id: transaction._id,
        date: transaction.createdAt
      } : null
    });
  } catch (error: any) {
    console.error("GET /api/listings/[id]/purchase-status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check purchase status" },
      { status: 500 }
    );
  }
}