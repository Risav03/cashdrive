'use client';

import { useState, useEffect } from 'react';
import { Item, BreadcrumbItem, UploadOptions, CreateFolderOptions } from '@/app/lib/types';
import { getItemsByParentId, getBreadcrumbPath, uploadItem, createFolder, getItemById } from '@/app/lib/fileExplorer';
import { BreadcrumbNav } from './BreadcrumbNav';
import { FileItem } from './FileItem';
import { UploadModal } from './UploadModal';
import { CreateFolderModal } from './CreateFolderModal';

export const FileExplorer = () => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [folderName, setFolderName] = useState('');

  const loadItems = async (folderId: string | null) => {
    setIsLoading(true);
    try {
      const newItems = await getItemsByParentId(folderId);
      setItems(newItems);
      
      if (folderId) {
        const path = await getBreadcrumbPath(folderId);
        setBreadcrumbs(path.filter(item => item.id !== 'root1'));
      } else {
        setBreadcrumbs([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems(currentFolderId);
  }, [currentFolderId]);

  const handleItemClick = (item: Item) => {
    if (item.type === 'folder') {
      setCurrentFolderId(item.id);
    } else {
      // Handle file click - could open preview, download, etc.
      console.log('File clicked:', item);
    }
  };

  const handleNavigate = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  const handleUpload = async (options: UploadOptions) => {
    try {
      await uploadItem(options);
      await loadItems(currentFolderId);
    } catch (error) {
      console.error('Upload failed:', error);
      // Handle error (show notification, etc.)
    }
  };

  const handleBack = async () => {
    if (currentFolderId) {
      // Find the current folder to get its parent
      const currentFolder = await getItemById(currentFolderId);
      if (currentFolder?.parentId === 'root1') {
        // If parent is root, go to root view (null)
        setCurrentFolderId(null);
      } else if (currentFolder?.parentId) {
        // Otherwise go to the parent folder
        setCurrentFolderId(currentFolder.parentId);
      }
    }
  };

  const handleCreateFolder = async (options: CreateFolderOptions) => {
    try {
      // If we're at root (currentFolderId is null), use 'root1' as parentId
      const parentId = currentFolderId || 'root1';
      
      await createFolder({
        ...options,
        parentId // Override the parentId to ensure it's created in current folder
      });
      
      await loadItems(currentFolderId); // This will refresh the current view
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">File Explorer</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCreateFolderModalOpen(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            New Folder
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Upload
          </button>
        </div>
      </div>

      {/* Navigation area with back button and breadcrumbs */}
      <div className="flex items-center gap-4 mb-4 text-black">
        {currentFolderId && (
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-full"
            title="Go back"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 19l-7-7 7-7" 
              />
            </svg>
          </button>
        )}
        {breadcrumbs.length > 0 && (
          <BreadcrumbNav items={breadcrumbs} onNavigate={handleNavigate} />
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64 text-black">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 text-black">
          {items.map((item) => (
            <div key={item.id} className="flex flex-row items-center p-4 rounded-lg bg-black/10 hover:bg-black/20 transition-colors cursor-pointer" onClick={() => handleItemClick(item)}>
              <div className="w-16 h-16 mb-2 flex items-center justify-center">
                {item.type === 'folder' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-center truncate w-full">{item.name}</span>
            </div>
          ))}
        </div>
      )}

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => {
          setIsCreateFolderModalOpen(false);
          setFolderName('');
        }}
        onCreateFolder={handleCreateFolder}
        parentId={currentFolderId || 'root1'}
      />

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        parentId={currentFolderId || 'root1'}
      />
    </div>
  );
}; 