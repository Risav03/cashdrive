import mongoose, { Document, Schema } from 'mongoose';

export interface IAIChunk extends Document {
  _id: string;
  item: mongoose.Types.ObjectId;
  text: string;
  embedding: number[];
  chunkIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

const aiChunkSchema = new Schema<IAIChunk>({
  item: {
    type: Schema.Types.ObjectId,
    ref: 'Item',
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true
  },
  embedding: {
    type: [Number],
    required: true
  },
  chunkIndex: {
    type: Number,
    required: true
  }
}, {
  timestamps: true,
  collection: 'ai_chunks'
});

aiChunkSchema.index({ item: 1, chunkIndex: 1 });
aiChunkSchema.index({ embedding: "2dsphere" });

export const AIChunk = mongoose.models.AIChunk || mongoose.model<IAIChunk>('AIChunk', aiChunkSchema); 