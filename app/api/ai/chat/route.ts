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
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, chatHistory = [] } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, {
        status: 400,
      });
    }

    // Define available tools for the AI
    const tools: ChatTool[] = [
      {
        type: "function",
        function: {
          name: "search_files",
          description:
            "Search through user's uploaded files for relevant content",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  "Search query to find relevant content in user files",
              },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "list_processed_files",
          description: "List all user files that are ready for AI processing",
          parameters: {
            type: "object",
            properties: {},
          },
        },
      },
      {
        type: "function",
        function: {
          name: "suggest_content_generation",
          description:
            "Suggest generating content based on found files and user request",
          parameters: {
            type: "object",
            properties: {
              contentType: {
                type: "string",
                enum: ["article", "report", "summary", "essay"],
                description: "Type of content to generate",
              },
              title: {
                type: "string",
                description: "Suggested title for the content",
              },
              sourceFiles: {
                type: "array",
                items: { type: "string" },
                description: "Names of source files to use",
              },
              sourceQuery: {
                type: "string",
                description:
                  "Search query to find relevant content for generation",
              },
            },
            required: ["contentType", "title", "sourceQuery"],
          },
        },
      },

      {
        type: "function",
        function: {
          name: "generate_content",
          description:
            "Actually generate and save content when user confirms they want to create it after seeing preview",
          parameters: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description:
                  "The content generation prompt based on user request",
              },
              contentType: {
                type: "string",
                enum: ["article", "report", "summary", "essay"],
                description: "Type of content to generate",
              },
              title: {
                type: "string",
                description: "Title for the content",
              },
              sourceQuery: {
                type: "string",
                description: "Query to find relevant source files",
              },
            },
            required: ["prompt", "contentType", "title"],
          },
        },
      },
    ];

    // Build conversation context
    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          `You are an AI content creation assistant. You help users create high-quality content using their uploaded files as context.

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
      },
      // Include recent chat history for context (limit to last 6 messages)
      ...chatHistory.slice(-6),
      {
        role: "user",
        content: message,
      },
    ];

    // Get AI response
    const response = await chatCompletion(messages, tools);
    const aiMessage = response.choices[0].message;

    // Handle tool calls if present
    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      const toolResults = await handleToolCalls(
        aiMessage.tool_calls,
        session.user.id,
      );

      return NextResponse.json({
        response: toolResults.content,
        sourceFiles: toolResults.sourceFiles,
        sourcesUsed: toolResults.sourcesUsed,
        canGenerate: toolResults.canGenerate,
        suggestedGeneration: toolResults.suggestedGeneration,
      });
    }

    // Return regular chat response
    return NextResponse.json({
      response: aiMessage.content,
      sourceFiles: [],
      canGenerate: false,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 },
    );
  }
}

interface SourceFile {
  name: string;
  source: "user" | "marketplace" | "shared" | "ai_generated";
  originalSeller?: string;
  sharedBy?: string;
}

async function handleToolCalls(toolCalls: any[], userId: string) {
  let finalResponse = "";
  let sourceFiles: string[] = [];
  let sourcesUsed: SourceFile[] = [];
  let canGenerate = false;
  let suggestedGeneration: any = null;

  for (const toolCall of toolCalls) {
    const { name, arguments: args } = toolCall.function;
    const parsedArgs = JSON.parse(args);

    switch (name) {
      case "search_files":
        const searchResults = await searchUserContent(parsedArgs.query, userId);
        sourceFiles = searchResults.map((result) => result.item.name);

        // Build detailed source information
        sourcesUsed = searchResults.map((result) => ({
          name: result.item.name,
          source: result.item.contentSource || "user",
          originalSeller: result.item.purchaseInfo?.sellerName,
          sharedBy: result.item.sharedInfo?.sharedByName,
        }));

        if (searchResults.length > 0) {
          finalResponse += `I found ${searchResults.length} relevant file${
            searchResults.length > 1 ? "s" : ""
          }:\n\n`;
          searchResults.slice(0, 5).forEach((result, index) => {
            const sourceIcon = result.item.contentSource === "marketplace"
              ? "🛒"
              : result.item.contentSource === "shared"
              ? "🔗"
              : result.item.contentSource === "ai_generated"
              ? "🤖"
              : "📄";
            finalResponse += `${sourceIcon} **${result.item.name}** (${
              Math.round(result.score * 100)
            }% match)\n`;
            finalResponse += `${result.chunk.text.substring(0, 200)}...\n\n`;
          });
          finalResponse +=
            "Would you like me to create content based on these files? I can generate articles, reports, summaries, or essays.";
          canGenerate = true;

          // Store the search query for potential content generation
          suggestedGeneration = {
            sourceQuery: parsedArgs.query,
            sourceFiles: sourceFiles,
          };
        } else {
          finalResponse +=
            `I couldn't find any relevant content for "${parsedArgs.query}". `;
          finalResponse +=
            "Make sure you have uploaded and processed some text files (PDF, Word, or plain text). ";
          finalResponse +=
            "You can check which files are ready by asking me to list your processed files.";
        }
        break;

      case "list_processed_files":
        const processedFiles = await getProcessedFiles(userId);

        // Build detailed source information for listing
        sourcesUsed = processedFiles.map((file) => ({
          name: file.name,
          source: file.contentSource || "user",
          originalSeller: file.purchaseInfo?.sellerName,
          sharedBy: file.sharedInfo?.sharedByName,
        }));

        if (processedFiles.length > 0) {
          finalResponse += "Here are your AI-ready files:\n\n";
          processedFiles.forEach((file) => {
            const sourceIcon = file.contentSource === "marketplace"
              ? "🛒"
              : file.contentSource === "shared"
              ? "🔗"
              : file.contentSource === "ai_generated"
              ? "🤖"
              : "📄";
            finalResponse += `${sourceIcon} **${file.name}**\n`;
            if (
              file.contentSource === "marketplace" &&
              file.purchaseInfo?.sellerName
            ) {
              finalResponse +=
                `Purchased from: ${file.purchaseInfo.sellerName}\n`;
            }
            if (
              file.contentSource === "shared" && file.sharedInfo?.sharedByName
            ) {
              finalResponse += `Shared by: ${file.sharedInfo.sharedByName}\n`;
            }
            if (file.aiProcessing?.topics?.length) {
              finalResponse += `Topics: ${
                file.aiProcessing.topics.join(", ")
              }\n`;
            }
            finalResponse += `Processed: ${
              new Date(file.aiProcessing.processedAt).toLocaleDateString()
            }\n\n`;
          });
          finalResponse +=
            "You can ask me to search through these files or create content based on them!";
        } else {
          finalResponse +=
            "You don't have any AI-ready files yet. Upload some text files (PDF, Word, or plain text) and they'll be processed automatically for AI use.";
        }
        break;

      case "suggest_content_generation":
        suggestedGeneration = {
          contentType: parsedArgs.contentType,
          title: parsedArgs.title,
          sourceFiles: parsedArgs.sourceFiles || sourceFiles,
          sourceQuery: parsedArgs.sourceQuery,
        };

        finalResponse +=
          `I suggest creating a **${parsedArgs.contentType}** titled "${parsedArgs.title}".`;
        if (sourceFiles.length > 0) {
          finalResponse += `\n\nI'll use content from: ${
            sourceFiles.join(", ")
          }`;
        }
        finalResponse +=
          "\n\n✨ **Check the Preview tab** to see the content before generating!\n\n";
        finalResponse +=
          '✅ Say "**generate it**" when you\'re ready to create and save the content.';
        canGenerate = true;
        break;

      case "generate_content":
        try {
          const result = await generateAndSaveContent({
            prompt: parsedArgs.prompt,
            contentType: parsedArgs.contentType,
            title: parsedArgs.title,
            sourceQuery: parsedArgs.sourceQuery,
            userId: userId,
            userDisplayName: undefined,
          });

          finalResponse += `✅ **Content Generated Successfully!**\n\n`;
          finalResponse += `📄 **${result.content.title}**\n`;
          finalResponse += `📊 Word Count: ${result.content.wordCount}\n\n`;
          finalResponse += `**Preview:**\n${
            result.content.content.substring(0, 500)
          }...\n\n`;
          finalResponse +=
            `Your content has been saved as a PDF in your "AI Generated" folder and is ready to be shared or sold on the marketplace!`;
        } catch (error) {
          console.error("Content generation failed:", error);
          finalResponse +=
            `❌ Sorry, I encountered an error while generating your content. Please try again.`;
        }
        break;
    }
  }

  return {
    content: finalResponse,
    sourceFiles,
    sourcesUsed,
    canGenerate,
    suggestedGeneration,
  };
}
