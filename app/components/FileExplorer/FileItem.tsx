'use client';

import { getFileIcon } from '@/app/lib/frontend/explorerFunctions';
import { Item } from '@/app/lib/types';
import { useState } from 'react';

interface FileItemProps {
  item: Item;
  onItemClick: (item: Item) => void;
  onListToMarketplace?: (item: Item) => void;
}

export const FileItem = ({ item, onItemClick, onListToMarketplace }: FileItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const icon = item.type === 'folder' ? '📁' : getFileIcon(item.mime);

  const handleMarketplaceClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onItemClick
    onListToMarketplace?.(item);
  };

  return (
    <div
      className="relative bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        onClick={() => onItemClick(item)}
        className="flex flex-row items-center justify-center p-4 cursor-pointer h-full"
      >
        <span className="text-4xl">{icon}</span>
        <div className="text-center w-full">
          <div className="font-medium text-gray-900 truncate">{item.name}</div>
          {item.type === 'file' && item.mime && (
            <div className="text-sm text-gray-600 truncate">{item.mime}</div>
          )}
        </div>
      </div>

      {/* Marketplace button - appears on hover */}
      {isHovered && onListToMarketplace && (
        <button
          onClick={handleMarketplaceClick}
          className="absolute top-2 right-2 bg-green-600 hover:bg-green-700 text-white p-1 rounded-full shadow-lg transition-all duration-200 z-10"
          title={`List ${item.name} to marketplace`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
            />
          </svg>
        </button>
      )}
    </div>
  );
}; 