import mongoose, { Document, Schema } from 'mongoose';

export interface ISharedLink extends Document {
  _id: string;
  item: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  linkId: string;
  type: 'public' | 'monetized';
  price?: number;
  title: string;
  description?: string;
  isActive: boolean;
  expiresAt?: Date;
  accessCount: number;
  paidUsers: mongoose.Types.ObjectId[];
  affiliateEnabled: boolean;
  defaultCommissionRate: number;
  createdAt: Date;
  updatedAt: Date;
}

const sharedLinkSchema = new Schema<ISharedLink>({
  item: {
    type: Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  linkId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['public', 'monetized'],
    required: true
  },
  price: {
    type: Number,
    min: 0,
    required: function(this: ISharedLink) {
      return this.type === 'monetized';
    }
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: null
  },
  accessCount: {
    type: Number,
    default: 0
  },
  paidUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  affiliateEnabled: {
    type: Boolean,
    default: false
  },
  defaultCommissionRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'sharedlinks'
});

// Indexes for performance
sharedLinkSchema.index({ owner: 1, createdAt: -1 });
sharedLinkSchema.index({ type: 1, isActive: 1 });
sharedLinkSchema.index({ expiresAt: 1 }, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { expiresAt: { $ne: null } }
});

// Pre-populate references
sharedLinkSchema.pre(['find', 'findOne'], function() {
  this.populate('item', 'name type size mimeType url')
      .populate('owner', 'name email wallet');
});

export const SharedLink = mongoose.models.SharedLink || mongoose.model<ISharedLink>('SharedLink', sharedLinkSchema);
export default SharedLink; 