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

    const processedText = await processTextFile(fileBuffer, item.mimeType);

    const embeddingResults = await generateEmbeddings(processedText.chunks);

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

export async function generateAndSaveContent({
  prompt,
  contentType = 'article',
  title,
  sourceQuery,
  userId,
  userDisplayName
}: {
  prompt: string;
  contentType?: string;
  title?: string;
  sourceQuery?: string;
  userId: string;
  userDisplayName?: string;
}) {
  const { chatCompletion } = await import('./openaiClient');
  const { generatePDF } = await import('./pdfGenerator');
  const { uploadFileToS3 } = await import('../s3');
  const { Item } = await import('../../models/Item');

  // Search for relevant content if sourceQuery provided
  let contextContent = '';
  let sourceFileIds: string[] = [];
  
  if (sourceQuery) {
    const searchResults = await searchUserContent(sourceQuery, userId, 8);
    if (searchResults.length > 0) {
      contextContent = searchResults
        .map(result => `From ${result.item.name}:\n${result.chunk.text}`)
        .join('\n\n---\n\n');
      sourceFileIds = searchResults.map(result => result.item._id);
    }
  }

  // Generate content using AI
  const systemPrompt = `You are a professional content writer. Create high-quality ${contentType} content based on the user's request and provided context.

${contextContent ? `Context from user's files:\n${contextContent}\n\n` : ''}

Instructions:
- Create well-structured, professional content
- Use the context naturally and cite sources when relevant
- Include proper headings and formatting
- Make the content engaging and informative
- Ensure the content is substantial and valuable
- Format with markdown-style headers (# ## ###)

Content Type: ${contentType}
${title ? `Suggested Title: ${title}` : ''}`;

  const messages = [
    {
      role: 'system' as const,
      content: systemPrompt
    },
    {
      role: 'user' as const,
      content: prompt
    }
  ];

  const response = await chatCompletion(messages, undefined, 0.7);
  const content = response.choices[0].message.content || '';

  // Extract title from content or use provided title
  let finalTitle = title;
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    finalTitle = titleMatch[1].trim();
  } else if (!finalTitle) {
    // Generate title from prompt if none provided
    const words = prompt.split(' ').slice(0, 8);
    finalTitle = words.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  // Create AI Generated folder if it doesn't exist
  const aiFolder = await ensureAIGeneratedFolder(userId);

  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `${finalTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_${timestamp}.pdf`;

  // Generate PDF
  const pdfBuffer = await generatePDF({
    title: finalTitle,
    content: content,
    author: userDisplayName || 'AI Assistant'
  });

  // Create a File object from the PDF buffer
  const arrayBuffer = new Uint8Array(pdfBuffer).buffer;
  const pdfFile = new File([arrayBuffer], fileName, { type: 'application/pdf' });

  // Upload to S3 using the s3.ts utility
  const uploadResult = await uploadFileToS3(pdfFile, fileName, userId);

  // Save as Item in MongoDB
  const newItem = await Item.create({
    name: fileName,
    type: 'file',
    parentId: aiFolder._id,
    owner: userId,
    url: uploadResult.url,
    size: pdfBuffer.length,
    mimeType: 'application/pdf',
    generatedBy: 'ai',
    sourcePrompt: prompt,
    sourceFiles: sourceFileIds
  });

  const wordCount = content.split(/\s+/).length;

  return {
    item: newItem,
    content: {
      title: finalTitle,
      content,
      wordCount
    },
    uploadResult
  };
} 