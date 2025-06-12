'use client';

import { Item } from '@/app/lib/types';
import { getFileIcon } from '@/app/lib/fileExplorer';

interface FileItemProps {
  item: Item;
  onItemClick: (item: Item) => void;
}

export const FileItem = ({ item, onItemClick }: FileItemProps) => {
  const icon = item.type === 'folder' ? '📁' : getFileIcon(item.mime);

  return (
    <div
      onClick={() => onItemClick(item)}
      className="flex items-center p-4 hover:bg-gray-100 rounded-lg cursor-pointer"
    >
      <span className="text-2xl mr-3">{icon}</span>
      <div>
        <div className="font-medium">{item.name}</div>
        {item.type === 'file' && item.mime && (
          <div className="text-sm text-gray-500">{item.mime}</div>
        )}
      </div>
    </div>
  );
}; 