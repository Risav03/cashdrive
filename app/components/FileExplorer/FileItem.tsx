'use client';

import { getFileIcon } from '@/app/lib/frontend/explorerFunctions';
import { Item } from '@/app/lib/types';
import { useState } from 'react';
import { FaFolder } from 'react-icons/fa';
import { BiShareAlt } from 'react-icons/bi';
import { MdOutlineStore } from 'react-icons/md';

interface FileItemProps {
  item: Item;
  onItemClick: (item: Item) => void;
  onListToMarketplace?: (item: Item) => void;
  onShareItem?: (item: Item) => void;
}

export const FileItem = ({ item, onItemClick, onListToMarketplace, onShareItem }: FileItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const IconComponent = item.type === 'folder' ? FaFolder : getFileIcon(item.mime);

  const handleMarketplaceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onListToMarketplace?.(item);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShareItem?.(item);
  };

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        onClick={() => onItemClick(item)}
        className={`
          bg-amber-100 border-2 border-black brutal-shadow-left
          hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center
          transition-all duration-300 cursor-pointer p-4
          ${isHovered ? 'translate-x-1 translate-y-1 brutal-shadow-center' : ''}
        `}
      >
        {/* Main Content - Horizontal Layout */}
        <div className="flex items-center gap-3 mt-10">
          <div className="text-3xl flex-shrink-0">
            <IconComponent className="w-8 h-8" />
          </div>
          <div className="min-w-0">
            <div className="font-freeman truncate">{item.name}</div>
            {item.type === 'file' && item.mime && (
              <div className="font-freeman text-xs truncate text-gray-700">
                {item.mime}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {isHovered && (onListToMarketplace || onShareItem) && (
          <div className="absolute top-2 right-2 flex gap-1">
            {/* Share button */}
            {onShareItem && (
              <button
                onClick={handleShareClick}
                className="bg-white border-2 border-black brutal-shadow-center hover:translate-y-1 hover:brutal-shadow-left p-1 transition-all"
                title={`Share ${item.name}`}
              >
                <BiShareAlt className="w-4 h-4" />
              </button>
            )}
            
            {/* Marketplace button */}
            {onListToMarketplace && (
              <button
                onClick={handleMarketplaceClick}
                className="bg-[#FFD000] border-2 border-black brutal-shadow-center hover:translate-y-1 hover:brutal-shadow-left p-1 transition-all"
                title={`List ${item.name} to marketplace`}
              >
                <MdOutlineStore className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Type indicator */}
        <div className="absolute top-2 left-2">
          <span className="font-freeman text-xs px-2 py-0.5 bg-white border-2 border-black brutal-shadow-center">
            {item.type}
          </span>
        </div>
      </div>
    </div>
  );
}; 