'use client';

import { useState, useEffect } from 'react';
import { Item, BreadcrumbItem, UploadOptions, CreateFolderOptions } from '@/app/lib/types';
import { getItemsByParentId, getBreadcrumbPath, uploadItem, createFolder, getUserRootFolder, getItemById } from '@/app/lib/frontend/explorerFunctions';
import { BreadcrumbNav } from './BreadcrumbNav';
import { FileItem } from './FileItem';
import { UploadModal } from './UploadModal';
import { CreateFolderModal } from './CreateFolderModal';
import { useApp } from '@/app/context/AppContext';

export const FileExplorer = () => {
  const { user, isLoadingUser } = useApp();
  const [currentFolder, setCurrentFolder] = useState<Item | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load root folder and its items when user is available
  useEffect(() => {
    async function loadRootFolder() {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const root = await getUserRootFolder();
        setCurrentFolder(root);
        const rootItems = await getItemsByParentId(root._id);
        console.log('Root items:', rootItems);
        setItems(rootItems);
        setBreadcrumbs([]);
      } catch (error) {
        console.error('Failed to load root folder:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadRootFolder();
  }, [user]);

  const loadFolderContents = async () => {
    if (!currentFolder || !user) return;
    
    setIsLoading(true);
    try {
      const newItems = await getItemsByParentId(currentFolder._id);
      setItems(newItems);
      const path = await getBreadcrumbPath(currentFolder._id);
      setBreadcrumbs(path);
    } catch (error) {
      console.error('Failed to load folder contents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update the useEffect to use the moved function
  useEffect(() => {
    if (currentFolder) {
      loadFolderContents();
    }
  }, [currentFolder, user]);

  // Show loading state while user is being fetched
  if (isLoadingUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show message if no user is found

  if (!user) {
    return <div>Please log in to view your files.</div>;
  }

  const handleItemClick = (item: Item) => {
    if (item.type === 'folder') {
      setCurrentFolder(item);
    } else {
      console.log('File clicked:', item);
    }
  };

  const handleNavigate = async (folderId: string) => {
    const targetFolder = breadcrumbs.find(item => item.id === folderId);
    if (targetFolder) {
      const folder = await getItemById(targetFolder.id);
      setCurrentFolder(folder);
    }
  };

  const handleUpload = async (options: UploadOptions) => {
    try {
      await uploadItem(options);
      await loadFolderContents();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleBack = async () => {
    if (currentFolder && breadcrumbs.length > 0) {
      const parentBreadcrumb = breadcrumbs[breadcrumbs.length - 2];
      
      if (!parentBreadcrumb) {
        const root = await getUserRootFolder();
        setCurrentFolder(root);
      } else {
        const parentFolder = await getItemById(parentBreadcrumb.id);
        setCurrentFolder(parentFolder);
      }
    }
  };

  const handleCreateFolder = async (options: CreateFolderOptions) => {
    try {
      const parentId = currentFolder?._id || user.rootStorageId;
      
      await createFolder({
        ...options,
        parentId
      });
      
      await loadFolderContents();
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  return (
    <div className="p-6 text-slate-800">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">File Explorer</h1>
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

      <div className="flex items-center gap-4 mb-4">
        {currentFolder?._id && (
          <button
            onClick={handleBack}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            title="Go back"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 text-gray-600" 
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
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item) => (
            <div key={item._id} className="bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shadow-sm">
              <FileItem
                key={item._id}
                item={item}
                onItemClick={handleItemClick}
              />
            </div>
          ))}
        </div>
      )}

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onCreateFolder={handleCreateFolder}
        parentId={currentFolder?._id || user.rootStorageId}
      />

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        parentId={currentFolder?._id || user.rootStorageId}
      />
    </div>
  )
}; 