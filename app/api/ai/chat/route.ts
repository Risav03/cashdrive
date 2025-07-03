import {
  generateAndSaveContent,
  getProcessedFiles,
  searchUserContent,
} from "@/app/lib/ai/aiService";
import {
  chatCompletion,
  ChatMessage,
  ChatTool,
} from "@/app/lib/ai/openaiClient";
import { authOptions } from "@/app/lib/backend/authConfig";
import { accessSharedLink } from "@/app/lib/frontend/sharedLinkFunctions";
import { Transaction } from "@/app/lib/models";
import connectDB from "@/app/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

// Constants
const CONTENT_TYPES = ["article", "report", "summary", "essay"] as const;
const CHAT_HISTORY_LIMIT = 6;
const SEARCH_RESULTS_LIMIT = 5;
const PREVIEW_TEXT_LIMIT = 200;
const CONTENT_PREVIEW_LIMIT = 500;

type ContentType = typeof CONTENT_TYPES[number];
type SourceType = "user_upload" | "marketplace_purchase" | "shared_link" | "ai_generated";

interface SourceFile {
  name: string;
  source: SourceType;
  originalSeller?: string;
  sharedBy?: string;
}

interface ToolResult {
  response: string;
  content: string; // Keep for backwards compatibility
  sourceFiles: string[];
  sourcesUsed: SourceFile[];
  canGenerate: boolean;
  suggestedGeneration?: any;
}

interface GenerationParams {
  contentType: ContentType;
  title: string;
  sourceFiles?: string[];
  sourceQuery: string;
}

const SOURCE_ICONS: Record<SourceType, string> = {
  marketplace_purchase: "🛒",
  shared_link: "🔗",
  ai_generated: "🤖",
  user_upload: "📄",
} as const;

const TOOL_NAMES = {
  SEARCH_FILES: "search_files",
  LIST_PROCESSED_FILES: "list_processed_files",
  SUGGEST_CONTENT_GENERATION: "suggest_content_generation",
  GENERATE_CONTENT: "generate_content",
} as const;

const MESSAGES = {
  UNAUTHORIZED: "Unauthorized",
  MESSAGE_REQUIRED: "Message is required",
  CHAT_ERROR: "Failed to process chat message",
  NO_FILES_FOUND: "You don't have any AI-ready files yet. Upload some text files (PDF, Word, or plain text) and they'll be processed automatically for AI use.",
  FILES_READY_PROMPT: "You can ask me to search through these files or create content based on them!",
  CONTENT_GENERATION_PROMPT: "Would you like me to create content based on these files? I can generate articles, reports, summaries, or essays.",
  GENERATION_ERROR: "❌ Sorry, I encountered an error while generating your content. Please try again.",
  CHECK_PREVIEW: "\n\n✨ **Check the Preview tab** to see the content before generating!\n\n✅ Say \"**generate it**\" when you're ready to create and save the content.",
} as const;

const AI_RESPONSES = {
  NO_SEARCH_RESULTS: (query: string) => `I couldn't find any relevant content for "${query}". Make sure you have uploaded and processed some text files (PDF, Word, or plain text). You can check which files are ready by asking me to list your processed files.`,
  SEARCH_RESULTS_FOUND: (count: number) => `I found ${count} relevant ${count === 1 ? 'file' : 'files'}:\n\n`,
  AI_READY_FILES_HEADER: "Here are your AI-ready files:\n\n",
  CONTENT_SUGGESTION: (contentType: string, title: string) => `I suggest creating a **${contentType}** titled "${title}".\n`,
  USING_CONTENT_FROM: (files: string[]) => `\nI'll use content from: ${files.join(", ")}`,
  GENERATION_SUCCESS: "✅ **Content Generated Successfully!**\n\n",
  FILE_TITLE: (title: string) => `📄 **${title}**\n`,
  WORD_COUNT: (count: number) => `📊 Word Count: ${count}\n\n`,
  PREVIEW_HEADER: "**Preview:**\n",
  SAVE_SUCCESS: '\nYour content has been saved as a PDF in your "AI Generated" folder and is ready to be shared or sold on the marketplace!',
  FILE_INFO_PURCHASED_FROM: (seller: string) => `Purchased from: ${seller}\n`,
  FILE_INFO_SHARED_BY: (sharer: string) => `Shared by: ${sharer}\n`,
  FILE_INFO_TOPICS: (topics: string[]) => `Topics: ${topics.join(", ")}\n`,
  FILE_INFO_PROCESSED: (date: string) => `Processed: ${date}\n`,
  SEARCH_RESULT_MATCH: (name: string, percentage: number) => `**${name}** (${percentage}% match)\n`,
} as const;

const SYSTEM_PROMPTS = {
  AI_ASSISTANT: `You are an AI content creation assistant. You help users create high-quality content using their uploaded files as context.

Available capabilities:
- Search through user's files for relevant information
- List files that are ready for AI processing
- Suggest content generation based on user requests and available files
- Actually generate content when users confirm they want it

Guidelines:
- Always be helpful and ask clarifying questions when needed
- Reference specific files when providing information
- When users ask for content generation or want to see a preview, use suggest_content_generation to set up the generation parameters
- When you use suggest_content_generation, the Preview tab will automatically show a preview of the content
- Always include a sourceQuery that captures what content to search for (use the user's request or search terms)
- When users say "yes", "generate it", "create it", or similar confirmations after seeing the preview, use generate_content
- Be conversational and friendly
- When suggesting content generation, provide a clear title and content type
- When generating content, create a detailed prompt that captures what the user wants
- Remember: Chat is for conversation and suggestions, Preview tab automatically shows previews when you suggest content generation`,
} as const;

const TOOL_DESCRIPTIONS = {
  CONTENT_TYPE: "Type of content to generate",
  SEARCH_FILES: "Search through user's uploaded files for relevant content",
  SEARCH_QUERY: "Search query to find relevant content in user files",
  LIST_FILES: "List all user files that are ready for AI processing",
  SUGGEST_GENERATION: "Suggest generating content based on found files and user request",
  SUGGESTED_TITLE: "Suggested title for the content",
  SOURCE_FILES: "Names of source files to use",
  SOURCE_QUERY: "Search query to find relevant content for generation",
  GENERATE_CONTENT: "Actually generate and save content when user confirms they want to create it after seeing preview",
  GENERATION_PROMPT: "The content generation prompt based on user request",
  CONTENT_TITLE: "Title for the content",
  FIND_SOURCE_FILES: "Query to find relevant source files",
} as const;

const LOG_MESSAGES = {
  GENERATION_FAILED: 'Content generation failed:',
  API_ERROR: 'Chat API error:',
  SOURCE_INFO_ERROR: 'Error fetching source info for',
} as const;


const createContentTypeSchema = () => ({
  type: "string" as const,
  enum: [...CONTENT_TYPES],
  description: TOOL_DESCRIPTIONS.CONTENT_TYPE,
});

const CHAT_TOOLS: ChatTool[] = [
  {
    type: "function",
    function: {
      name: TOOL_NAMES.SEARCH_FILES,
      description: TOOL_DESCRIPTIONS.SEARCH_FILES,
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: TOOL_DESCRIPTIONS.SEARCH_QUERY,
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: TOOL_NAMES.LIST_PROCESSED_FILES,
      description: TOOL_DESCRIPTIONS.LIST_FILES,
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: TOOL_NAMES.SUGGEST_CONTENT_GENERATION,
      description: TOOL_DESCRIPTIONS.SUGGEST_GENERATION,
      parameters: {
        type: "object",
        properties: {
          contentType: createContentTypeSchema(),
          title: {
            type: "string",
            description: TOOL_DESCRIPTIONS.SUGGESTED_TITLE,
          },
          sourceFiles: {
            type: "array",
            items: { type: "string" },
            description: TOOL_DESCRIPTIONS.SOURCE_FILES,
          },
          sourceQuery: {
            type: "string",
            description: TOOL_DESCRIPTIONS.SOURCE_QUERY,
          },
        },
        required: ["contentType", "title", "sourceQuery"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: TOOL_NAMES.GENERATE_CONTENT,
      description: TOOL_DESCRIPTIONS.GENERATE_CONTENT,
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: TOOL_DESCRIPTIONS.GENERATION_PROMPT,
          },
          contentType: createContentTypeSchema(),
          title: {
            type: "string",
            description: TOOL_DESCRIPTIONS.CONTENT_TITLE,
          },
          sourceQuery: {
            type: "string",
            description: TOOL_DESCRIPTIONS.FIND_SOURCE_FILES,
          },
        },
        required: ["prompt", "contentType", "title"],
      },
    },
  },
];

// Helper functions
const getSourceIcon = (source: SourceType): string => SOURCE_ICONS[source];

const pluralize = (count: number, singular: string, plural?: string): string =>
  count === 1 ? singular : (plural || singular + 's');

const formatMatchPercentage = (score: number): number => Math.round(score * 100);

const truncateText = (text: string, limit: number): string =>
  text.length > limit ? `${text.substring(0, limit)}...` : text;

async function getTransactionByItemId(itemId: string): Promise<any> {
  await connectDB();
  
  const transaction = await Transaction.findOne({
    item: itemId,
    status: 'completed'
  }).populate('seller', 'name');
  
  return transaction;
}

async function getSourceInfo(file: any): Promise<SourceFile> {
  const sourceInfo: SourceFile = {
    name: file.name,
    source: file.contentSource || "user_upload",
  };

  if (!file._id) return sourceInfo;

  try {
    switch (sourceInfo.source) {
      case "marketplace_purchase": {
        const transaction = await getTransactionByItemId(file._id);
        if (transaction?.seller?.name) {
          sourceInfo.originalSeller = transaction.seller.name;
        }
        break;
      }
      case "shared_link": {
        const { link } = await accessSharedLink(file._id);
        if (link?.owner?.name) {
          sourceInfo.sharedBy = link.owner.name;
        }
        break;
      }
    }
  } catch (error) {
    console.error(`${LOG_MESSAGES.SOURCE_INFO_ERROR} ${file.name}:`, error);
  }

  return sourceInfo;
}

function formatFileInfo(file: any, sourceInfo: SourceFile): string {
  const icon = getSourceIcon(sourceInfo.source);
  let info = `${icon} **${file.name}**\n`;

  if (sourceInfo.originalSeller) {
    info += AI_RESPONSES.FILE_INFO_PURCHASED_FROM(sourceInfo.originalSeller);
  }
  if (sourceInfo.sharedBy) {
    info += AI_RESPONSES.FILE_INFO_SHARED_BY(sourceInfo.sharedBy);
  }
  if (file.aiProcessing?.topics?.length) {
    info += AI_RESPONSES.FILE_INFO_TOPICS(file.aiProcessing.topics);
  }
  if (file.aiProcessing?.processedAt) {
    info += AI_RESPONSES.FILE_INFO_PROCESSED(new Date(file.aiProcessing.processedAt).toLocaleDateString());
  }

  return info;
}

function formatSearchResult(result: any): string {
  const icon = getSourceIcon(result.item.contentSource || "user_upload");
  const matchPercentage = formatMatchPercentage(result.score);
  const preview = truncateText(result.chunk.text, PREVIEW_TEXT_LIMIT);

  return `${icon} ${AI_RESPONSES.SEARCH_RESULT_MATCH(result.item.name, matchPercentage)}${preview}\n\n`;
}

async function processFilesWithSourceInfo(files: any[]): Promise<SourceFile[]> {
  return Promise.all(files.map(file => getSourceInfo(file)));
}

// Tool handlers
async function handleSearchFiles(args: any, userId: string): Promise<Partial<ToolResult>> {
  const searchResults = await searchUserContent(args.query, userId);
  const sourceFiles = searchResults.map(result => result.item.name);
  const sourcesUsed = await processFilesWithSourceInfo(searchResults.map(r => r.item));

  if (searchResults.length === 0) {
    return {
      content: AI_RESPONSES.NO_SEARCH_RESULTS(args.query),
      sourceFiles: [],
      sourcesUsed: [],
      canGenerate: false,
    };
  }

  let content = AI_RESPONSES.SEARCH_RESULTS_FOUND(searchResults.length);

  searchResults.slice(0, SEARCH_RESULTS_LIMIT).forEach(result => {
    content += formatSearchResult(result);
  });

  content += MESSAGES.CONTENT_GENERATION_PROMPT;

  return {
    content,
    sourceFiles,
    sourcesUsed,
    canGenerate: true,
    suggestedGeneration: { sourceQuery: args.query, sourceFiles },
  };
}

async function handleListProcessedFiles(userId: string): Promise<Partial<ToolResult>> {
  const processedFiles = await getProcessedFiles(userId);
  const sourcesUsed = await processFilesWithSourceInfo(processedFiles);

  if (processedFiles.length === 0) {
    return {
      content: MESSAGES.NO_FILES_FOUND,
      sourceFiles: [],
      sourcesUsed: [],
      canGenerate: false,
    };
  }

  let content = AI_RESPONSES.AI_READY_FILES_HEADER;

  processedFiles.forEach(file => {
    const sourceInfo = sourcesUsed.find(s => s.name === file.name)!;
    content += formatFileInfo(file, sourceInfo) + "\n";
  });

  content += MESSAGES.FILES_READY_PROMPT;

  return {
    content,
    sourceFiles: processedFiles.map(f => f.name),
    sourcesUsed,
    canGenerate: false,
  };
}

function handleSuggestContentGeneration(args: GenerationParams, sourceFiles: string[]): Partial<ToolResult> {
  const suggestedGeneration = {
    contentType: args.contentType,
    title: args.title,
    sourceFiles: args.sourceFiles || sourceFiles,
    sourceQuery: args.sourceQuery,
  };

  let content = AI_RESPONSES.CONTENT_SUGGESTION(args.contentType, args.title);

  if (sourceFiles.length > 0) {
    content += AI_RESPONSES.USING_CONTENT_FROM(sourceFiles);
  }

  content += MESSAGES.CHECK_PREVIEW;

  return {
    content,
    sourceFiles,
    sourcesUsed: [],
    canGenerate: true,
    suggestedGeneration,
  };
}

async function handleGenerateContent(args: any, userId: string): Promise<Partial<ToolResult>> {
  try {
    const result = await generateAndSaveContent({
      prompt: args.prompt,
      contentType: args.contentType,
      title: args.title,
      sourceQuery: args.sourceQuery,
      userId,
      userDisplayName: undefined,
    });

    const preview = truncateText(result.content.content, CONTENT_PREVIEW_LIMIT);
    const content = AI_RESPONSES.GENERATION_SUCCESS +
      AI_RESPONSES.FILE_TITLE(result.content.title) +
      AI_RESPONSES.WORD_COUNT(result.content.wordCount) +
      AI_RESPONSES.PREVIEW_HEADER + preview +
      AI_RESPONSES.SAVE_SUCCESS;

    return {
      content,
      sourceFiles: [],
      sourcesUsed: [],
      canGenerate: false,
    };
  } catch (error) {
    console.error(LOG_MESSAGES.GENERATION_FAILED, error);
    return {
      content: MESSAGES.GENERATION_ERROR,
      sourceFiles: [],
      sourcesUsed: [],
      canGenerate: false,
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const { message, chatHistory = [] } = await req.json();
    if (!message) {
      return NextResponse.json({ error: MESSAGES.MESSAGE_REQUIRED }, { status: 400 });
    }

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPTS.AI_ASSISTANT },
      ...chatHistory.slice(-CHAT_HISTORY_LIMIT),
      { role: "user", content: message },
    ];

    const response = await chatCompletion(messages, CHAT_TOOLS);
    const aiMessage = response.choices[0].message;

    if (aiMessage.tool_calls?.length) {
      const toolResults = await handleToolCalls(aiMessage.tool_calls, session.user.id);
      return NextResponse.json(toolResults);
    }

    return NextResponse.json({
      response: aiMessage.content,
      sourceFiles: [],
      canGenerate: false,
    });
  } catch (error) {
    console.error(LOG_MESSAGES.API_ERROR, error);
    return NextResponse.json(
      { error: MESSAGES.CHAT_ERROR },
      { status: 500 },
    );
  }
}

async function handleToolCalls(toolCalls: any[], userId: string): Promise<ToolResult> {
  let finalResponse = "";
  let sourceFiles: string[] = [];
  let sourcesUsed: SourceFile[] = [];
  let canGenerate = false;
  let suggestedGeneration: any = null;

  for (const toolCall of toolCalls) {
    const { name, arguments: args } = toolCall.function;
    const parsedArgs = JSON.parse(args);
    let result: Partial<ToolResult> = {};

    switch (name) {
      case TOOL_NAMES.SEARCH_FILES:
        result = await handleSearchFiles(parsedArgs, userId);
        break;
      case TOOL_NAMES.LIST_PROCESSED_FILES:
        result = await handleListProcessedFiles(userId);
        break;
      case TOOL_NAMES.SUGGEST_CONTENT_GENERATION:
        result = handleSuggestContentGeneration(parsedArgs, sourceFiles);
        break;
      case TOOL_NAMES.GENERATE_CONTENT:
        result = await handleGenerateContent(parsedArgs, userId);
        break;
    }

    // Merge results
    if (result.content) {
      finalResponse += result.content + "\n\n";
    }
    if (result.sourceFiles) {
      sourceFiles = [...sourceFiles, ...result.sourceFiles];
    }
    if (result.sourcesUsed) {
      sourcesUsed = [...sourcesUsed, ...result.sourcesUsed];
    }
    if (result.canGenerate !== undefined) {
      canGenerate = result.canGenerate;
    }
    if (result.suggestedGeneration) {
      suggestedGeneration = result.suggestedGeneration;
    }
  }

  return {
    response: finalResponse.trim(),
    content: finalResponse.trim(), // Keep for backwards compatibility
    sourceFiles: Array.from(new Set(sourceFiles)),
    sourcesUsed,
    canGenerate,
    suggestedGeneration,
  };
}
