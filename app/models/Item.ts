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
    default: null
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  size: {
    type: Number,
    required: function(this: any) {
      return this?.type === 'file';
    }
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
    processedAt: Date,
    topics: [String],
    chunksCount: {
      type: Number,
      default: 0
    }
  },
  contentSource: {
    type: String,
    enum: ['user_upload', 'ai_generated', 'marketplace_purchase', 'shared_link'],
    default: 'user_upload'
  },
  aiGeneration: {
    sourcePrompt: {
      type: String,
      required: function(this: any) {
        return this.contentSource === 'ai_generated';
      }
    },
    sourceFiles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item'
    }],
    generatedAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

itemSchema.index({ parentId: 1, name: 1, owner: 1 }, { unique: true });

export const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);