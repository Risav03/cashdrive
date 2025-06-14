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
  }
}, {
  timestamps: true
});

itemSchema.index({ parentId: 1, name: 1, owner: 1 }, { unique: true });

export const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);