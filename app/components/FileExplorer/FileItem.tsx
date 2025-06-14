'use client';

import { getFileIcon } from '@/app/lib/frontend/explorerFunctions';
import { Item } from '@/app/lib/types';
import { useState } from 'react';

interface FileItemProps {
  item: Item;
  onItemClick: (item: Item) => void;
  onListToMarketplace?: (item: Item) => void;
  onShareItem?: (item: Item) => void;
}

export const FileItem = ({ item, onItemClick, onListToMarketplace, onShareItem }: FileItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const icon = item.type === 'folder' ? '📁' : getFileIcon(item.mime);

  const handleMarketplaceClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onItemClick
    onListToMarketplace?.(item);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onItemClick
    onShareItem?.(item);
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

      {/* Action buttons - appear on hover */}
      {isHovered && (onListToMarketplace || onShareItem) && (
        <div className="absolute top-2 right-2 flex space-x-1">
          {/* Share button */}
          {onShareItem && (
            <button
              onClick={handleShareClick}
              className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-full shadow-lg transition-all duration-200 z-10"
              title={`Share ${item.name}`}
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
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" 
                />
              </svg>
            </button>
          )}
          
          {/* Marketplace button */}
          {onListToMarketplace && (
            <button
              onClick={handleMarketplaceClick}
              className="bg-green-600 hover:bg-green-700 text-white p-1 rounded-full shadow-lg transition-all duration-200 z-10"
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
      )}
    </div>
  );
}; 