import mongoose, { Document, Schema } from "mongoose";

export const DEFAULT_COMMISSION_RATE = 10;

export interface IAffiliate extends Document {
  _id: string;
  listing?: mongoose.Types.ObjectId;
  sharedLink?: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  affiliateUser: mongoose.Types.ObjectId;
  commissionRate: number;
  affiliateCode: string;
  status: "active" | "inactive" | "suspended";
  totalEarnings: number;
  totalSales: number;
  createdAt: Date;
  updatedAt: Date;
}

const affiliateSchema = new Schema<IAffiliate>({
  listing: {
    type: Schema.Types.ObjectId,
    ref: "Listing",
    required: false,
  },
  sharedLink: {
    type: Schema.Types.ObjectId,
    ref: "SharedLink",
    required: false,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  affiliateUser: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  commissionRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: DEFAULT_COMMISSION_RATE,
  },
  affiliateCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    minlength: 6,
    maxlength: 20,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "suspended"],
    default: "active",
  },
  totalEarnings: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalSales: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
  collection: "affiliates",
});

affiliateSchema.pre("validate", function () {
  const hasListing = !!this.listing;
  const hasSharedLink = !!this.sharedLink;

  if (!hasListing && !hasSharedLink) {
    this.invalidate("listing", "Either listing or sharedLink must be provided");
  }

  if (hasListing && hasSharedLink) {
    this.invalidate("sharedLink", "Cannot have both listing and sharedLink");
  }
});

affiliateSchema.index({ affiliateCode: 1 }, { unique: true });
affiliateSchema.index({ owner: 1, status: 1 });
affiliateSchema.index({ affiliateUser: 1, status: 1 });
affiliateSchema.index({ listing: 1, status: 1 });
affiliateSchema.index({ sharedLink: 1, status: 1 });

affiliateSchema.index({
  listing: 1,
  sharedLink: 1,
  owner: 1,
  affiliateUser: 1,
}, {
  unique: true,
  partialFilterExpression: {
    $or: [
      { listing: { $exists: true } },
      { sharedLink: { $exists: true } },
    ],
  },
});

export const Affiliate = mongoose.models.Affiliate || mongoose.model<IAffiliate>("Affiliate", affiliateSchema);
