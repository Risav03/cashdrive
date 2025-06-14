import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  _id: string;
  listing?: mongoose.Types.ObjectId; // Optional for shared link transactions
  buyer: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  item: mongoose.Types.ObjectId;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  transactionId: string; // Unique transaction identifier
  receiptNumber: string; // Human-readable receipt number
  purchaseDate: Date;
  metadata?: any; // Additional data for different transaction types
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  listing: {
    type: Schema.Types.ObjectId,
    ref: 'Listing',
    required: false // Optional for shared link transactions
  },
  buyer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  item: {
    type: Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed', 'refunded'],
    default: 'completed'
  },
  transactionId: {
    type: String,
    required: true
  },
  receiptNumber: {
    type: String,
    required: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true,
  collection: 'transaction'
});

// Indexes for performance
transactionSchema.index({ buyer: 1, purchaseDate: -1 });
transactionSchema.index({ seller: 1, purchaseDate: -1 });
transactionSchema.index({ listing: 1 });
transactionSchema.index({ transactionId: 1 }, { unique: true });
transactionSchema.index({ receiptNumber: 1 }, { unique: true });

// Note: No unique constraint on listing+buyer combination
// This allows multiple buyers to purchase the same digital product

// Removed pre-populate to avoid schema registration issues
// Population will be handled explicitly in API routes when needed

export const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', transactionSchema); 