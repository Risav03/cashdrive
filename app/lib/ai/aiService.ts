import { Item } from '@/app/models/Item';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { generateEmbedding, generateEmbeddings } from './openaiClient';
import { processTextFile } from './textProcessor';

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!,
  },
});

export async function processFileForAI(itemId: string): Promise<void> {
  try {
    const item = await Item.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const processableTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!processableTypes.includes(item.mimeType)) {
      console.log(`Skipping non-processable file type: ${item.mimeType}`);
      return;
    }

    if (item.mimeType === 'application/pdf') {
      console.log(`Processing PDF file: ${item.name} (limited text extraction)`);
    }

    item.aiProcessing.status = 'processing';
    await item.save();

    let s3Key = item.url;
    if (item.url.startsWith('https://')) {
      const urlParts = item.url.split('/');
      s3Key = urlParts.slice(3).join('/');
    }
    
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: s3Key,
    });

    const response = await s3Client.send(getObjectCommand);
    const fileBuffer = Buffer.from(await response.Body!.transformToByteArray());

    // Process text content
    const processedText = await processTextFile(fileBuffer, item.mimeType);

    // Generate embeddings for chunks
    const embeddingResults = await generateEmbeddings(processedText.chunks);

    // Update item with processed data
    item.aiProcessing = {
      status: 'completed',
      textContent: processedText.content,
      chunks: embeddingResults.map((result, index) => ({
        text: result.text,
        embedding: result.embedding,
        chunkIndex: index
      })),
      processedAt: new Date(),
      topics: processedText.topics
    };

    await item.save();
    console.log(`Successfully processed file: ${item.name}`);

  } catch (error) {
    console.error('Error processing file for AI:', error);
    
    // Update status to failed
    const item = await Item.findById(itemId);
    if (item) {
      item.aiProcessing.status = 'failed';
      await item.save();
    }
    
    throw error;
  }
}

export interface SearchResult {
  item: any;
  chunk: any;
  score: number;
}

export async function searchUserContent(query: string, userId: string, limit: number = 10): Promise<SearchResult[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Find items with AI processing completed that the user has access to:
    // 1. User's own files
    // 2. Marketplace items they've purchased 
    // 3. Items shared with them
    const items = await Item.find({
      $or: [
        // User's own files
        { owner: userId },
        // Marketplace items purchased by user
        { 
          contentSource: 'marketplace',
          'purchaseInfo.purchasedBy': userId 
        },
        // Items shared with user
        {
          contentSource: 'shared',
          'sharedInfo.sharedWith': userId
        }
      ],
      'aiProcessing.status': 'completed',
      'aiProcessing.chunks.0': { $exists: true }
    });

    const results: SearchResult[] = [];

    // Calculate similarity for each chunk
    for (const item of items) {
      for (const chunk of item.aiProcessing.chunks) {
        const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
        if (similarity > 0.7) { // Threshold for relevance
          results.push({
            item: {
              _id: item._id,
              name: item.name,
              mimeType: item.mimeType,
              contentSource: item.contentSource || 'user',
              purchaseInfo: item.purchaseInfo,
              sharedInfo: item.sharedInfo
            },
            chunk: {
              text: chunk.text,
              chunkIndex: chunk.chunkIndex
            },
            score: similarity
          });
        }
      }
    }

    // Group by file and keep only the best match per file
    const fileResults = new Map<string, SearchResult>();
    
    for (const result of results) {
      const fileId = result.item._id.toString();
      if (!fileResults.has(fileId) || result.score > fileResults.get(fileId)!.score) {
        fileResults.set(fileId, result);
      }
    }

    // Sort by similarity score and return top results
    return Array.from(fileResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

  } catch (error) {
    console.error('Error searching user content:', error);
    throw new Error('Failed to search content');
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function getProcessedFiles(userId: string) {
  return await Item.find({
    $or: [
      // User's own files
      { owner: userId },
      // Marketplace items purchased by user
      { 
        contentSource: 'marketplace',
        'purchaseInfo.purchasedBy': userId 
      },
      // Items shared with user
      {
        contentSource: 'shared',
        'sharedInfo.sharedWith': userId
      }
    ],
    'aiProcessing.status': 'completed'
  }).select('name aiProcessing.topics aiProcessing.processedAt mimeType contentSource purchaseInfo sharedInfo');
}

export async function ensureAIGeneratedFolder(userId: string) {
  const User = (await import('@/app/models/User')).default;
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  let aiFolder = await Item.findOne({
    name: "AI Generated",
    type: "folder",
    parentId: user.rootFolder,
    owner: userId
  });

  if (!aiFolder) {
    aiFolder = await Item.create({
      name: "AI Generated",
      type: "folder", 
      parentId: user.rootFolder,
      owner: userId
    });
  }

  return aiFolder;
} 