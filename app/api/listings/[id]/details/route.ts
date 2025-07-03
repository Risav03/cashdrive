import { Listing } from "@/app/lib/models";
import connectDB from "@/app/lib/mongodb";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

interface ListingDetailsDocument {
  price: number;
  title: string;
  seller?: {
    wallet: string;
  };
}

interface ListingDetails {
  price: number;
  title: string;
  sellerWallet?: string;
}

const isValidObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

async function getListingDetails(listingId: string): Promise<ListingDetails> {
  if (!isValidObjectId(listingId)) {
    throw new Error("Invalid listing ID format");
  }

  const listing = await Listing.findById(listingId)
    .populate("seller", "wallet")
    .select("price title seller")
    .lean<ListingDetailsDocument>();

  if (!listing) {
    throw new Error("Listing not found");
  }

  return {
    price: listing.price,
    title: listing.title,
    sellerWallet: listing.seller?.wallet,
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const params = await context.params;
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Listing ID is required" }, { status: 400 });
    }
    const details = await getListingDetails(id);
    return NextResponse.json(details);
  } catch (error: any) {
    console.error("GET /api/listings/[id]/details error:", error);
    const status = error.message === "Invalid listing ID format"
      ? 400
      : error.message === "Listing not found"
      ? 404
      : 500;

    return NextResponse.json({
      error: error.message || "Failed to fetch listing details",
    }, { status });
  }
}
