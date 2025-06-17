import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['file', 'folder']
  },
  parentId: {
    type: String,
    default: null,
    index: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  size: {
    type: Number,
    default: 0
  },
  mimeType: {
    type: String,
    default: null
  },
  url: {
    type: String,
    default: null
  },

  aiProcessing: {
    status: { 
      type: String, 
      enum: ['none', 'pending', 'processing', 'completed', 'failed'],
      default: 'none'
    },
    textContent: String,
    chunks: [{
      text: String,
      embedding: [Number],
      chunkIndex: Number
    }],
    processedAt: Date,
    topics: [String]
  },
  
  generatedBy: {
    type: String,
    enum: ['user', 'ai'],
    default: 'user'
  },
  sourcePrompt: String,
  sourceFiles: [mongoose.Schema.Types.ObjectId],
  
  // Content source tracking
  contentSource: {
    type: String,
    enum: ['user', 'marketplace', 'shared', 'ai_generated'],
    default: 'user'
  },
  
  // Purchase information for marketplace items
  purchaseInfo: {
    transactionId: String,
    purchasedAt: Date,
    originalName: String,
    originalSeller: String
  },
  
  // Shared link information
  sharedInfo: {
    linkId: String,
    sharedAt: Date,
    sharedBy: String
  } 
}, {
  timestamps: true
});

itemSchema.index({ parentId: 1, name: 1, owner: 1 }, { unique: true });

itemSchema.index({ "aiProcessing.chunks.embedding": "2dsphere" });

export const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);