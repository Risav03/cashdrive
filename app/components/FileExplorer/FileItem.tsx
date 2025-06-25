'use client';

import { useApp } from '@/app/context/AppContext';
import { getFileIcon } from '@/app/lib/frontend/explorerFunctions';
import { Item } from '@/app/lib/types';
import { useState } from 'react';
import { BiShareAlt, BiTrash } from 'react-icons/bi';
import { FaFolder, FaRobot } from 'react-icons/fa';
import { MdOutlineStore } from 'react-icons/md';

interface FileItemProps {
  item: Item;
  onItemClick: (item: Item) => void;
  onListToMarketplace?: (item: Item) => void;
  onShareItem?: (item: Item) => void;
  onDeleteItem?: (item: Item) => void;
}

export const FileItem = ({ item, onItemClick, onListToMarketplace, onShareItem, onDeleteItem }: FileItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { openFileViewer } = useApp();
  const IconComponent = item?.type === 'folder' ? FaFolder : getFileIcon(item?.mimeType);

  const handleItemClick = () => {
    if (item?.type === 'folder') {
      onItemClick(item);
    } else {
      openFileViewer(item);
    }
  };

  const handleMarketplaceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onListToMarketplace?.(item);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShareItem?.(item);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteItem?.(item);
  };

  // Only show AI Ready badge for completed processing
  const isAIReady = item.aiProcessing?.status === 'completed';

  return (
    <>
      <div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          onClick={handleItemClick}
          className={`
            bg-amber-100 hover:bg-white border-2 border-black button-primary
            transition-all duration-100 cursor-pointer p-4
            h-[140px]
            ${isHovered ? 'translate-x-1 translate-y-1 brutal-shadow-center' : ''}
          `}
        >
          {/* Main Content - Vertical Layout */}
          <div className="flex flex-col h-full">
            {/* Type indicator and AI Ready badge */}
            <div className="mb-2">
              <div className="flex items-center gap-2">
                <span className="font-freeman text-xs px-2 py-0.5 bg-white border-2 border-black brutal-shadow-center">
                  {item?.type}
                </span>
                {isAIReady && (
                  <span className="font-freeman text-xs px-2 py-0.5 bg-green-100 border-2 border-black brutal-shadow-center flex items-center gap-1">
                    <FaRobot className="w-3 h-3" />
                    AI Ready
                  </span>
                )}
              </div>
            </div>

            {/* File/Folder Content */}
            <div className="flex items-center gap-3 flex-1">
              <div className="text-3xl flex-shrink-0 relative">
                <IconComponent className="w-8 h-8" />
                {/* AI Generated Badge on icon */}
                {item.generatedBy === 'ai' && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 border border-black rounded-full flex items-center justify-center">
                    <FaRobot className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-freeman truncate text-sm">{item.name}</div>
                {item?.type === 'file' && item?.mimeType && (
                  <div className="font-freeman text-xs truncate text-gray-700">
                    {item?.mimeType}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {isHovered && (onListToMarketplace || onShareItem || onDeleteItem) && (
            <div className="absolute top-2 right-2 flex gap-1">
              {/* Delete button */}
              {onDeleteItem && (
                <button
                  onClick={handleDeleteClick}
                  className="bg-red-100 border-2 border-black brutal-shadow-center hover:translate-y-1 hover:brutal-shadow-left p-1 transition-all"
                  title={`Delete ${item.name}`}
                >
                  <BiTrash className="w-4 h-4" />
                </button>
              )}
              
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
                  className="bg-primary border-2 border-black brutal-shadow-center hover:translate-y-1 hover:brutal-shadow-left p-1 transition-all"
                  title={`List ${item.name} to marketplace`}
                >
                  <MdOutlineStore className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};