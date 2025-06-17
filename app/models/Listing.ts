import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true,
    unique: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0.01, 'Price must be greater than 0']
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  tags: {
    type: [String],
    default: []
  },
  views: {
    type: Number,
    default: 0
  },
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
});

listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index({ seller: 1, status: 1 });
listingSchema.index({ price: 1 });

// Removed pre-populate to avoid schema registration issues
// Population will be handled explicitly in API routes when needed

export const Listing = mongoose.models.Listing || mongoose.model('Listing', listingSchema); 