'use client';

import { getFileIcon } from '@/app/lib/frontend/explorerFunctions';
import { formatFileSize } from '@/app/lib/frontend/sharedLinkFunctions';
import { Item } from '@/app/lib/types';
import Image from 'next/image';
import { useState } from 'react';
import { MdClose, MdFullscreen, MdFullscreenExit } from 'react-icons/md';

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
}

export const FileViewerModal = ({ isOpen, onClose, item }: FileViewerModalProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const IconComponent = getFileIcon(item?.mimeType);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (!isOpen) return null;

  const renderContent = () => {
    console.log('Rendering content:', {
      url: item.url,
      mime: item.mime,
      mimeType: item?.mimeType,
      type: item?.type
    });

    if (!item.url) {
      return (
        <div className="text-center p-8">
          <div className="text-6xl mb-4">
            <IconComponent className="w-16 h-16 mx-auto" />
          </div>
          <p className="mb-4 font-freeman">File URL not available</p>
        </div>
      );
    }

    const isAudio = item.mime?.startsWith('audio/') || 
                   item?.mimeType?.startsWith('audio/') ||
                   item.url.match(/\.(mp3|wav|ogg|m4a)$/i);

    if (isAudio) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-4 space-y-4">
          <div className="text-4xl">
            <IconComponent className="w-12 h-12" />
          </div>
          
          <h3 className="font-freeman text-lg">{item.name}</h3>
          
          <div className="w-full max-w-2xl bg-white p-4 rounded-lg border-2 border-black brutal-shadow-center">
            <audio 
              controls
              autoPlay={false}
              className="w-full"
              preload="metadata"
            >
              <source src={item.url} type={item.mime || item?.mimeType || 'audio/mpeg'} />
              <a href={item.url} download={item.name} className="text-blue-500 hover:underline">
                Download Audio
              </a>
            </audio>
          </div>

          <div className="mt-4">
            <a
              href={item.url}
              download={item.name}
              className="button-primary bg-primary px-6 py-3 inline-block"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download Audio File
            </a>
          </div>
        </div>
      );
    }

    if (item?.type === 'file' && item?.mimeType?.startsWith('image/')) {
      return (
        <div className="relative w-full h-full">
          <Image
            src={item.url}
            alt={item.name}
            className="object-contain w-full h-full"
            width={800}
            height={600}
            priority
          />
        </div>
      );
    }

    if (item?.mimeType?.startsWith('video/')) {
      return (
        <div className="h-full flex items-center justify-center">
          <video 
            src={item.url} 
            controls
            className="max-w-full max-h-full"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (item?.mimeType === 'application/pdf') {
      return (
        <iframe
          src={item.url}
          className="w-full h-full"
          title={item.name}
        />
      );
    }

    if (item?.mimeType?.startsWith('text/') || 
        item?.mimeType?.includes('javascript') || 
        item?.mimeType?.includes('json') || 
        item?.mimeType?.includes('xml') || 
        item?.mimeType?.includes('css')) {
      return (
        <iframe
          src={item.url}
          className="w-full h-full"
          title={item.name}
        />
      );
    }

    return (
      <div className="text-center p-8">
        <div className="text-6xl mb-4">
          <IconComponent className="w-16 h-16 mx-auto" />
        </div>
        <p className="mb-4 font-freeman">This file type cannot be previewed</p>
        <a
          href={item.url}
          download={item.name}
          className="button-primary bg-primary px-6 py-3 inline-block"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download File
        </a>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div 
        className={`flex flex-col bg-amber-100 border-2 border-black brutal-shadow-left ${
          isFullscreen 
            ? 'w-screen h-screen m-0' 
            : 'w-[90vw] h-[85vh] m-auto'
        }`}
      >
        <div className="p-4 border-b-2 border-black bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <IconComponent className="w-6 h-6" />
            <div>
              <h2 className="font-freeman text-lg">{item.name}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{item.mime || item?.mimeType}</span>
                {item.size && (
                  <>
                    <span>•</span>
                    <span>{formatFileSize(item.size)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <MdFullscreenExit className="w-6 h-6" />
              ) : (
                <MdFullscreen className="w-6 h-6" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Close"
            >
              <MdClose className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white">
          <div className="h-full">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};
