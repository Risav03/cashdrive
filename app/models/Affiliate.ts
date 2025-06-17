import mongoose, { Document, Schema } from 'mongoose';

export interface IAffiliate extends Document {
  _id: string;
  listing: mongoose.Types.ObjectId;
  sharedLink?: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId; // Content owner
  affiliateUser: mongoose.Types.ObjectId; // User who will earn commission
  commissionRate: number; // Percentage (0-100)
  affiliateCode: string; // Unique code for tracking
  status: 'active' | 'inactive' | 'suspended';
  totalEarnings: number;
  totalSales: number;
  createdAt: Date;
  updatedAt: Date;
}

const affiliateSchema = new Schema<IAffiliate>({
  listing: {
    type: Schema.Types.ObjectId,
    ref: 'Listing',
    required: false // Can be null for shared link affiliates
  },
  sharedLink: {
    type: Schema.Types.ObjectId,
    ref: 'SharedLink',
    required: false // Can be null for listing affiliates
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true // Content owner who sets the commission
  },
  affiliateUser: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true // User who earns commission
  },
  commissionRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 10 // 10% default commission
  },
  affiliateCode: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  totalEarnings: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSales: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  collection: 'affiliates'
});

// Indexes for performance
affiliateSchema.index({ affiliateCode: 1 }, { unique: true });
affiliateSchema.index({ owner: 1, affiliateUser: 1 });
affiliateSchema.index({ listing: 1 });
affiliateSchema.index({ sharedLink: 1 });
affiliateSchema.index({ status: 1 });

// Compound index to prevent duplicate affiliates for same content
affiliateSchema.index({ 
  listing: 1, 
  sharedLink: 1, 
  owner: 1, 
  affiliateUser: 1 
}, { 
  unique: true,
  partialFilterExpression: {
    $or: [
      { listing: { $exists: true } },
      { sharedLink: { $exists: true } }
    ]
  }
});

export const Affiliate = mongoose.models.Affiliate || mongoose.model<IAffiliate>('Affiliate', affiliateSchema);