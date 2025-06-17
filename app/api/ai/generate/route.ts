import { ensureAIGeneratedFolder, searchUserContent } from '@/app/lib/ai/aiService';
import { chatCompletion, ChatMessage } from '@/app/lib/ai/openaiClient';
import { calculateEstimatedPrice, generatePDF } from '@/app/lib/ai/pdfGenerator';
import { authOptions } from '@/app/lib/backend/authConfig';
import { Item } from '@/app/models/Item';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, contentType = 'article', title, sourceQuery, preview = false } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Search for relevant content if sourceQuery provided
    let contextContent = '';
    let sourceFileIds: string[] = [];
    let sourcesUsed: any[] = [];
    
    if (sourceQuery) {
      const searchResults = await searchUserContent(sourceQuery, session.user.id, 8);
      if (searchResults.length > 0) {
        contextContent = searchResults
          .map(result => `From ${result.item.name}:\n${result.chunk.text}`)
          .join('\n\n---\n\n');
        sourceFileIds = searchResults.map(result => result.item._id);
        
        // Build detailed source information
        sourcesUsed = searchResults.map(result => ({
          name: result.item.name,
          source: result.item.contentSource || 'user',
          originalSeller: result.item.purchaseInfo?.sellerName,
          sharedBy: result.item.sharedInfo?.sharedByName,
          relevanceScore: Math.round(result.score * 100)
        }));
      }
    }

    // Generate content using AI
    const generatedContent = await generateContentWithContext(
      prompt,
      contextContent,
      contentType,
      title
    );

    // Calculate suggested price
    const suggestedPrice = calculateEstimatedPrice(generatedContent.content);
    const wordCount = generatedContent.content.split(/\s+/).length;

    // If preview mode, return content without saving
    if (preview) {
      return NextResponse.json({
        title: generatedContent.title,
        content: generatedContent.content,
        wordCount,
        suggestedPrice,
        sourcesUsed,
        isPreview: true
      });
    }

    // Create AI Generated folder if it doesn't exist
    const aiFolder = await ensureAIGeneratedFolder(session.user.id);

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${generatedContent.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_${timestamp}.pdf`;

    // Generate PDF
    const pdfBuffer = await generatePDF({
      title: generatedContent.title,
      content: generatedContent.content,
      author: session.user.name || 'AI Assistant'
    });

    // Upload to S3
    const s3Key = `generated-content/${session.user.id}/${nanoid()}-${fileName}`;
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
    });

    await s3Client.send(uploadCommand);

    // Save as Item in MongoDB
    const newItem = await Item.create({
      name: fileName,
      type: 'file',
      parentId: aiFolder._id,
      owner: session.user.id,
      url: s3Key,
      size: pdfBuffer.length,
      mimeType: 'application/pdf',
      generatedBy: 'ai',
      sourcePrompt: prompt,
      sourceFiles: sourceFileIds
    });

    return NextResponse.json({
      success: true,
      file: {
        id: newItem._id,
        name: fileName,
        size: pdfBuffer.length,
        url: s3Key
      },
      content: {
        title: generatedContent.title,
        wordCount,
        preview: generatedContent.content.substring(0, 500) + '...'
      },
      suggestedPrice,
      sourcesUsed,
      message: `Generated "${generatedContent.title}" and saved to your AI Generated folder`
    });

  } catch (error) {
    console.error('Content generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}

async function generateContentWithContext(
  prompt: string,
  contextContent: string,
  contentType: string,
  suggestedTitle?: string
): Promise<{ title: string; content: string }> {
  
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
${suggestedTitle ? `Suggested Title: ${suggestedTitle}` : ''}`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const response = await chatCompletion(messages, undefined, 0.7);
  const content = response.choices[0].message.content || '';

  // Extract title from content or generate one
  let title = suggestedTitle || extractTitleFromContent(content) || generateTitleFromPrompt(prompt);

  return { title, content };
}

function extractTitleFromContent(content: string): string | null {
  // Look for the first heading in the content
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  // Look for title-like patterns at the beginning
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine.length < 100 && !firstLine.endsWith('.')) {
      return firstLine.replace(/^#+\s*/, '');
    }
  }
  
  return null;
}

function generateTitleFromPrompt(prompt: string): string {
  // Simple title generation from prompt
  const words = prompt.split(' ').slice(0, 8);
  return words.map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
} 