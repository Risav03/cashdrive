import mongoose, { Document, Schema } from 'mongoose';

export interface ICommission extends Document {
  _id: string;
  affiliate: mongoose.Types.ObjectId;
  originalTransaction: mongoose.Types.ObjectId;
  commissionTransaction: mongoose.Types.ObjectId;
  commissionAmount: number;
  commissionRate: number;
  status: 'pending' | 'paid' | 'failed';
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const commissionSchema = new Schema<ICommission>({
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
  commissionTransaction: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction',
    required: false
  },
  commissionAmount: {
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
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  paidAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true,
  collection: 'commissions'
});

// Indexes
commissionSchema.index({ affiliate: 1, createdAt: -1 });
commissionSchema.index({ originalTransaction: 1 });
commissionSchema.index({ status: 1 });

commissionSchema.index({ 
  originalTransaction: 1, 
  affiliate: 1 
}, { unique: true });

export const Commission = mongoose.models.Commission || mongoose.model<ICommission>('Commission', commissionSchema);