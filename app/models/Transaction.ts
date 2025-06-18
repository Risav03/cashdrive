import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  _id: string;
  listing?: mongoose.Types.ObjectId;
  sharedLink?: mongoose.Types.ObjectId;
  buyer: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  item: mongoose.Types.ObjectId;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  transactionId: string;
  receiptNumber: string;
  purchaseDate: Date;
  transactionType: 'purchase' | 'sale' | 'commission';
  paymentFlow: 'direct' | 'admin';
  affiliateInfo?: {
    isAffiliateSale: boolean;
    originalAmount: number;
    netAmount: number;
    commissionDistribution: {
      affiliateId: mongoose.Types.ObjectId;
      amount: number;
      commissionRate: number;
    }[];
  };
  parentTransaction?: mongoose.Types.ObjectId;
  metadata?: {
    blockchainTransaction?: string;
    network?: string;
    payer?: string;
    success?: boolean;
    paymentResponseRaw?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  listing: {
    type: Schema.Types.ObjectId,
    ref: 'Listing',
    required: false
  },
  sharedLink: {
    type: Schema.Types.ObjectId,
    ref: 'SharedLink',
    required: false
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
    required: true,
    unique: true
  },
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  transactionType: {
    type: String,
    enum: ['purchase', 'sale', 'commission'],
    required: true
  },
  paymentFlow: {
    type: String,
    enum: ['direct', 'admin'],
    required: true,
    default: 'direct'
  },
  affiliateInfo: {
    type: {
      isAffiliateSale: Boolean,
      originalAmount: Number,
      netAmount: Number,
      commissionDistribution: [{
        affiliateId: {
          type: Schema.Types.ObjectId,
          ref: 'Affiliate'
        },
        amount: Number,
        commissionRate: Number
      }]
    },
    required: false
  },
  parentTransaction: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction',
    required: false
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true,
});

// Indexes
transactionSchema.index({ buyer: 1, purchaseDate: -1 });
transactionSchema.index({ seller: 1, purchaseDate: -1 });
transactionSchema.index({ transactionType: 1, parentTransaction: 1 });
transactionSchema.index({ 'affiliateInfo.commissionDistribution.affiliateId': 1 });
transactionSchema.index({ paymentFlow: 1, transactionType: 1 });

export const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', transactionSchema); 