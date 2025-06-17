import mongoose, { Document, Schema } from 'mongoose';

export interface IAffiliateTransaction extends Document {
  _id: string;
  affiliate: mongoose.Types.ObjectId;
  originalTransaction: mongoose.Types.ObjectId; // Reference to the main transaction
  affiliateUser: mongoose.Types.ObjectId; // User who earned commission
  owner: mongoose.Types.ObjectId; // Content owner
  buyer: mongoose.Types.ObjectId; // Customer who made the purchase
  saleAmount: number; // Original sale amount
  commissionRate: number; // Commission rate at time of sale
  commissionAmount: number; // Calculated commission
  status: 'pending' | 'paid' | 'failed';
  paidAt?: Date;
  affiliateCode: string; // Code used for tracking
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const affiliateTransactionSchema = new Schema<IAffiliateTransaction>({
  affiliate: {
    type: Schema.Types.ObjectId,
    ref: 'Affiliate',
    required: true
  },
  originalTransaction: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  affiliateUser: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  saleAmount: {
    type: Number,
    required: true,
    min: 0
  },
  commissionRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  commissionAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  paidAt: {
    type: Date,
    required: false
  },
  affiliateCode: {
    type: String,
    required: true,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true,
  collection: 'affiliate_transactions'
});

// Indexes for performance
affiliateTransactionSchema.index({ affiliate: 1, createdAt: -1 });
affiliateTransactionSchema.index({ affiliateUser: 1, status: 1 });
affiliateTransactionSchema.index({ owner: 1, createdAt: -1 });
affiliateTransactionSchema.index({ originalTransaction: 1 });
affiliateTransactionSchema.index({ affiliateCode: 1 });
affiliateTransactionSchema.index({ status: 1, createdAt: -1 });

// Prevent duplicate affiliate transactions for same original transaction
affiliateTransactionSchema.index({ 
  originalTransaction: 1, 
  affiliate: 1 
}, { unique: true });

export const AffiliateTransaction = mongoose.models.AffiliateTransaction || mongoose.model<IAffiliateTransaction>('AffiliateTransaction', affiliateTransactionSchema);