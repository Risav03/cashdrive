'use client';

import { Item } from '@/app/lib/types';
import { getFileIcon } from '@/app/lib/frontend/explorerFunctions';

interface FileItemProps {
  item: Item;
  onItemClick: (item: Item) => void;
}

export const FileItem = ({ item, onItemClick }: FileItemProps) => {
  const icon = item.type === 'folder' ? '📁' : getFileIcon(item.mime);

  return (
    <div
      onClick={() => onItemClick(item)}
      className="flex flex-row items-center justify-center p-4 cursor-pointer h-full"
    >
      <span className="text-4xl">{icon}</span>
      <div className=" text-center w-full flex flex-col items-start justify-center">
        <div className="font-medium text-white/80 ml-5 truncate w-fit">{item.name}</div>
        {item.type === 'file' && item.mime && (
          <div className="text-sm w-fit text-white/80 truncate">{item.mime}</div>
        )}
      </div>
    </div>
  );
}; 