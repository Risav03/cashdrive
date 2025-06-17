import { generateAndSaveContent, searchUserContent } from '@/app/lib/ai/aiService';
import { chatCompletion, ChatMessage } from '@/app/lib/ai/openaiClient';
import { authOptions } from '@/app/lib/backend/authConfig';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

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

    // Build sources used info for response
    let sourcesUsed: any[] = [];
    if (sourceQuery) {
      const searchResults = await searchUserContent(sourceQuery, session.user.id, 8);
      sourcesUsed = searchResults.map(result => ({
        name: result.item.name,
        source: result.item.contentSource || 'user',
        originalSeller: result.item.purchaseInfo?.sellerName,
        sharedBy: result.item.sharedInfo?.sharedByName,
        relevanceScore: Math.round(result.score * 100)
      }));
    }

    // If preview mode, generate content without saving
    if (preview) {
      const generatedContent = await generateContentWithContext(
        prompt,
        sourceQuery ? await getContextContent(sourceQuery, session.user.id) : '',
        contentType,
        title
      );

      return NextResponse.json({
        title: generatedContent.title,
        content: generatedContent.content,
        wordCount: generatedContent.content.split(/\s+/).length,
        sourcesUsed,
        isPreview: true
      });
    }

    // Actually generate and save content
    const result = await generateAndSaveContent({
      prompt,
      contentType,
      title,
      sourceQuery,
      userId: session.user.id,
      userDisplayName: session.user.name || undefined
    });

    return NextResponse.json({
      success: true,
      file: {
        id: result.item._id,
        name: result.item.name,
        size: result.item.size,
        url: result.uploadResult.url
      },
      content: {
        title: result.content.title,
        wordCount: result.content.wordCount,
        preview: result.content.content.substring(0, 500) + '...'
      },
      sourcesUsed,
      message: `Generated "${result.content.title}" and saved to your AI Generated folder`
    });

  } catch (error) {
    console.error('Content generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}

async function getContextContent(sourceQuery: string, userId: string): Promise<string> {
  const searchResults = await searchUserContent(sourceQuery, userId, 8);
  if (searchResults.length > 0) {
    return searchResults
      .map(result => `From ${result.item.name}:\n${result.chunk.text}`)
      .join('\n\n---\n\n');
  }
  return '';
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
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
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
  const words = prompt.split(' ').slice(0, 8);
  return words.map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
} 