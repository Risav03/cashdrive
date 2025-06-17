'use client';

import { useEffect, useRef, useState } from 'react';
import { FaFileAlt, FaLink, FaPaperPlane, FaRobot, FaShoppingCart, FaSpinner, FaUser } from 'react-icons/fa';

interface SourceFile {
  name: string;
  source: 'user' | 'marketplace' | 'shared' | 'ai_generated';
  originalSeller?: string;
  sharedBy?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sourceFiles?: string[]; // Legacy support
  sourcesUsed?: SourceFile[]; // New detailed sources
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onMessagesUpdate: (messages: ChatMessage[]) => void;
  onCanGenerate: (canGenerate: boolean, suggestion?: any) => void;
  onMarketplaceSearch: (query: string) => void;
  showMarketplace?: boolean;
}

export default function ChatInterface({ messages, onMessagesUpdate, onCanGenerate, onMarketplaceSearch, showMarketplace = false }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    onMessagesUpdate(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          chatHistory: messages.slice(-6) // Send last 6 messages for context
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        sourceFiles: data.sourceFiles, // Legacy support
        sourcesUsed: data.sourcesUsed // New detailed sources
      };

      const finalMessages = [...newMessages, assistantMessage];
      onMessagesUpdate(finalMessages);
      
      // Notify parent about generate state
      onCanGenerate(data.canGenerate, data.suggestedGeneration);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      const finalMessages = [...newMessages, errorMessage];
      onMessagesUpdate(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleMarketplaceSearch = () => {
    // Get the last user message for marketplace search
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const query = lastUserMessage?.content || '';
    onMarketplaceSearch(query);
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

  const renderSourceFiles = (message: ChatMessage) => {
    // Use new detailed sources if available, otherwise fall back to legacy
    if (message.sourcesUsed && message.sourcesUsed.length > 0) {
      // Group sources by type
      const groupedSources = message.sourcesUsed.reduce((acc, source) => {
        if (!acc[source.source]) {
          acc[source.source] = [];
        }
        acc[source.source].push(source);
        return acc;
      }, {} as Record<string, SourceFile[]>);

      return (
        <div className="mt-2 pt-2 border-t border-gray-300">
          <div className="text-xs text-gray-600 mb-2 font-medium">📚 Content Sources Used:</div>
          <div className="space-y-2">
            {Object.entries(groupedSources).map(([sourceType, sources]) => (
              <div key={sourceType}>
                <div className="flex items-center gap-1 mb-1">
                  {getSourceIcon(sourceType)}
                  <span className="text-xs font-medium text-gray-700">
                    {getSourceLabel(sourceType)} ({sources.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 ml-4">
                  {sources.map((source, idx) => (
                    <div key={idx} className={`inline-flex items-center gap-1 px-2 py-1 text-xs border rounded ${getSourceBadgeColor(source.source)}`}>
                      <span className="font-medium">{source.name}</span>
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
    }

    // Legacy fallback
    if (message.sourceFiles && message.sourceFiles.length > 0) {
      return (
        <div className="mt-2 pt-2 border-t border-gray-300">
          <div className="text-xs text-gray-600 mb-1">Referenced files:</div>
          <div className="flex flex-wrap gap-1">
            {message.sourceFiles.map((file, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 text-xs border border-gray-300">
                <FaFileAlt className="text-xs" />
                {file}
              </span>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center ${
                message.role === 'user' ? 'bg-blue-100' : 'bg-[#FFD000]'
              }`}>
                {message.role === 'user' ? <FaUser className="text-sm" /> : <FaRobot className="text-sm" />}
              </div>
              
              <div className={`border-2 border-black p-3 ${
                message.role === 'user' 
                  ? 'bg-blue-50 brutal-shadow-right' 
                  : 'bg-white brutal-shadow-left'
              }`}>
                <div className="whitespace-pre-wrap font-freeman text-sm">
                  {message.content}
                </div>
                
                {renderSourceFiles(message)}
                
                <div className="text-xs text-gray-500 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-black bg-[#FFD000] flex items-center justify-center">
                <FaSpinner className="text-sm animate-spin" />
              </div>
              <div className="border-2 border-black bg-white p-3 brutal-shadow-left">
                <div className="font-freeman text-sm text-gray-600">
                  AI is thinking...
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
        {/* Marketplace Discovery Button - Only show when marketplace is not open */}
        {!showMarketplace && (
          <div className="mb-3 flex justify-center">
            <button
              onClick={handleMarketplaceSearch}
              className="bg-purple-100 border-2 border-black brutal-shadow-center hover:translate-y-1 transition-all px-4 py-2 font-freeman font-bold"
            >
              <FaShoppingCart className="inline mr-2" />
              Find Relevant Marketplace Content
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to analyze your files or discuss content ideas..."
            className="flex-1 border-2 border-black p-3 font-freeman resize-none"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-[#FFD000] border-2 border-black brutal-shadow-center hover:translate-y-1 transition-all p-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaPaperPlane />
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-600 font-freeman">
          Try: &quot;Analyze my research papers&quot; or &quot;What content can I create from my files?&quot;
        </div>
      </div>
    </div>
  );
} 