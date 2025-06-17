'use client';

import { useCallback, useEffect, useState } from 'react';
import { FaCheck, FaDollarSign, FaFileAlt, FaLink, FaRobot, FaRocket, FaShoppingCart, FaSpinner } from 'react-icons/fa';

interface GeneratedContent {
  title: string;
  content: string;
  wordCount: number;
  suggestedPrice: number;
  fileName: string;
  createdAt: Date;
}

interface SourceFile {
  name: string;
  source: 'user' | 'marketplace' | 'shared' | 'ai_generated';
  originalSeller?: string;
  sharedBy?: string;
  relevanceScore?: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sourceFiles?: string[];
}

interface ContentPreviewProps {
  generatedContent: GeneratedContent[];
  canGenerate: boolean;
  suggestedGeneration?: any;
  chatMessages: ChatMessage[];
  onContentGenerated: (content: any) => void;
}

export default function ContentPreview({ 
  generatedContent, 
  canGenerate, 
  suggestedGeneration, 
  chatMessages, 
  onContentGenerated 
}: ContentPreviewProps) {
  const [selectedContent, setSelectedContent] = useState<GeneratedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewContent, setPreviewContent] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [lastPreviewParams, setLastPreviewParams] = useState<string>('');

  useEffect(() => {
    if (generatedContent.length > 0 && !selectedContent) {
      setSelectedContent(generatedContent[0]);
    }
  }, [generatedContent, selectedContent]);

  const generatePreview = useCallback(async () => {
    if (!suggestedGeneration) return;

    setIsLoadingPreview(true);
    
    try {
      // Use the last user message as the prompt
      const lastUserMessage = chatMessages.filter(m => m.role === 'user').pop();
      if (!lastUserMessage) return;

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: lastUserMessage.content,
          contentType: suggestedGeneration?.contentType || 'article',
          title: suggestedGeneration?.title,
          sourceQuery: suggestedGeneration?.sourceQuery || lastUserMessage.content,
          preview: true // Add preview flag
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const data = await response.json();
      setPreviewContent(data);

    } catch (error) {
      console.error('Preview generation error:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [suggestedGeneration, chatMessages]);

  // Auto-generate preview when suggestedGeneration changes
  useEffect(() => {
    if (canGenerate && suggestedGeneration && !isLoadingPreview) {
      // Create a unique key for this preview request
      const currentParams = JSON.stringify({
        title: suggestedGeneration?.title,
        contentType: suggestedGeneration?.contentType,
        sourceQuery: suggestedGeneration?.sourceQuery,
        lastUserMessage: chatMessages.filter(m => m.role === 'user').pop()?.content
      });
      
      // Only generate if parameters have changed
      if (currentParams !== lastPreviewParams || !previewContent) {
        setLastPreviewParams(currentParams);
        generatePreview();
      }
    }
    // Reset preview if canGenerate becomes false
    if (!canGenerate) {
      setPreviewContent(null);
      setLastPreviewParams('');
    }
  }, [canGenerate, suggestedGeneration, chatMessages, isLoadingPreview, lastPreviewParams, previewContent, generatePreview]);

  const handleGenerate = async () => {
    if (!canGenerate || !suggestedGeneration) return;

    setIsGenerating(true);
    
    try {
      // Use the last user message as the prompt
      const lastUserMessage = chatMessages.filter(m => m.role === 'user').pop();
      if (!lastUserMessage) return;

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: lastUserMessage.content,
          contentType: suggestedGeneration?.contentType || 'article',
          title: suggestedGeneration?.title,
          sourceQuery: lastUserMessage.content // Use the prompt as search query
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();
      
      // Notify parent component
      onContentGenerated(data);

    } catch (error) {
      console.error('Generation error:', error);
      // Could add error notification here
    } finally {
      setIsGenerating(false);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'marketplace':
        return <FaShoppingCart className="text-purple-600" />;
      case 'shared':
        return <FaLink className="text-blue-600" />;
      case 'ai_generated':
        return <FaRobot className="text-green-600" />;
      default:
        return <FaFileAlt className="text-gray-600" />;
    }
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'marketplace':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'shared':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'ai_generated':
        return 'bg-green-100 border-green-300 text-green-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'marketplace':
        return 'Marketplace';
      case 'shared':
        return 'Shared';
      case 'ai_generated':
        return 'AI Generated';
      default:
        return 'My Files';
    }
  };

  const renderSourcesUsed = (sources: SourceFile[]) => {
    if (!sources || sources.length === 0) return null;

    // Group sources by type
    const groupedSources = sources.reduce((acc, source) => {
      if (!acc[source.source]) {
        acc[source.source] = [];
      }
      acc[source.source].push(source);
      return acc;
    }, {} as Record<string, SourceFile[]>);

    return (
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          📚 Content Sources Used
        </div>
        <div className="space-y-2">
          {Object.entries(groupedSources).map(([sourceType, sourceList]) => (
            <div key={sourceType}>
              <div className="flex items-center gap-1 mb-1">
                {getSourceIcon(sourceType)}
                <span className="text-xs font-medium text-gray-700">
                  {getSourceLabel(sourceType)} ({sourceList.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1 ml-5">
                {sourceList.map((source, idx) => (
                  <div key={idx} className={`inline-flex items-center gap-1 px-2 py-1 text-xs border rounded ${getSourceBadgeColor(source.source)}`}>
                    <span className="font-medium">{source.name}</span>
                    {source.relevanceScore && (
                      <span className="text-xs opacity-75">({source.relevanceScore}%)</span>
                    )}
                    {source.originalSeller && (
                      <span className="text-xs opacity-75">by {source.originalSeller}</span>
                    )}
                    {source.sharedBy && (
                      <span className="text-xs opacity-75">from {source.sharedBy}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!canGenerate && generatedContent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <FaFileAlt className="text-6xl text-gray-300 mb-4" />
        <h3 className="font-anton text-xl text-gray-600 mb-2">No Content Ready</h3>
        <p className="font-freeman text-gray-500 mb-4">
          Start a conversation in the Chat tab to analyze your files and prepare content for generation.
        </p>
        <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded">
          <p className="font-freeman text-sm text-blue-700">
            💡 Try asking about your files, their content, or what kind of articles you could create from them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Generation Section */}
      {canGenerate && (
        <div className="border-b-2 border-black p-4 bg-green-50 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-anton text-lg">Ready to Generate</h3>
              {suggestedGeneration && (
                <p className="font-freeman text-sm text-gray-600">
                  {suggestedGeneration.contentType}: {suggestedGeneration.title}
                </p>
              )}
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-green-100 border-2 border-black brutal-shadow-center hover:translate-y-1 transition-all px-6 py-3 font-freeman font-bold disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <FaSpinner className="inline mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FaRocket className="inline mr-2" />
                  Generate Final
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Preview Content */}
        {canGenerate && previewContent && (
          <div className="p-4 border-b-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 text-xs font-bold border border-blue-300 rounded">
                  DRAFT
                </span>
                <h3 className="font-anton text-lg">{previewContent.title}</h3>
              </div>
              <div className="text-sm text-gray-600">
                {previewContent.wordCount} words • ${previewContent.suggestedPrice}
              </div>
            </div>

            {/* Sources Used in Preview */}
            {renderSourcesUsed(previewContent.sourcesUsed)}

            {/* Loading State */}
            {isLoadingPreview && (
              <div className="flex items-center justify-center py-8">
                <FaSpinner className="animate-spin mr-2" />
                <span className="font-freeman">Generating preview...</span>
              </div>
            )}

            {/* Content Preview */}
            {!isLoadingPreview && (
              <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded max-h-96 overflow-y-auto">
                <div className="prose max-w-none font-freeman text-sm">
                  <div className="whitespace-pre-wrap">
                    {previewContent.content}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generated Content List */}
        {generatedContent.length > 0 && (
          <div className="p-4">
            <h3 className="font-anton text-lg mb-4 flex items-center gap-2">
              <FaCheck className="text-green-600" />
              Generated Content
            </h3>
            
            <div className="space-y-4">
              {generatedContent.map((content, index) => (
                <div 
                  key={index}
                  className={`border-2 border-black p-4 cursor-pointer transition-all ${
                    selectedContent === content 
                      ? 'bg-green-50 brutal-shadow-center' 
                      : 'bg-white hover:bg-gray-50 brutal-shadow-right'
                  }`}
                  onClick={() => setSelectedContent(content)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-green-100 text-green-800 px-2 py-1 text-xs font-bold border border-green-300 rounded">
                        FINAL
                      </span>
                      <h4 className="font-anton text-md">{content.title}</h4>
                    </div>
                    <div className="text-sm text-gray-600">
                      {content.wordCount} words
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{new Date(content.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      <FaDollarSign className="text-green-600" />
                      <span>${content.suggestedPrice}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Content State */}
        {!canGenerate && generatedContent.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <FaFileAlt className="text-6xl text-gray-300 mb-4" />
            <h3 className="font-anton text-xl text-gray-600 mb-2">No Content Ready</h3>
            <p className="font-freeman text-gray-500">
              Start a conversation in the Chat tab to prepare content for generation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 