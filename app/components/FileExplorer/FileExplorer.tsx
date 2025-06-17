'use client';

import { useApp } from '@/app/context/AppContext';
import { createFolder, getBreadcrumbPath, getItem, getItemsByParentId, getUserRootFolder, uploadItem } from '@/app/lib/frontend/explorerFunctions';
import { BreadcrumbItem, CreateFolderOptions, Item, UploadOptions } from '@/app/lib/types';
import { useEffect, useState } from 'react';
import CreateListingModal from '../CreateListingModal';
import Loader from '../global/Loader';
import CreateSharedLinkModal from '../SharedLinks/CreateSharedLinkModal';
import { BreadcrumbNav } from './BreadcrumbNav';
import { CreateFolderModal } from './CreateFolderModal';
import { FileItem } from './FileItem';
import { UploadModal } from './UploadModal';

interface FileExplorerProps {
  compact?: boolean;
}

export const FileExplorer = ({ compact = false }: FileExplorerProps) => {
  const { user, isLoadingUser, showNotification } = useApp();
  const [currentFolder, setCurrentFolder] = useState<Item | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [selectedItemForListing, setSelectedItemForListing] = useState<Item | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedItemForSharing, setSelectedItemForSharing] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadRootFolder() {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const root = await getUserRootFolder();
        setCurrentFolder(root);
        const rootItems = await getItemsByParentId(root._id);
        
        // Sort items: folders first, then files, both sorted by date
        const sortedItems = rootItems.sort((a, b) => {
          // First, separate folders and files
          if (a.type === 'folder' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'folder') return 1;
          
          // Then sort by date (newest first)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setItems(sortedItems);
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
      
      // Sort items: folders first, then files, both sorted by date
      const sortedItems = newItems.sort((a, b) => {
        // First, separate folders and files
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        
        // Then sort by date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setItems(sortedItems);
      const path = await getBreadcrumbPath(currentFolder._id);
      setBreadcrumbs(path);
    } catch (error) {
      console.error('Failed to load folder contents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentFolder) {
      loadFolderContents();
    }
  }, [currentFolder, user]);

  if (isLoadingUser) {
    return (
      <div className='flex justify-center items-center mt-10'>
        <Loader />
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

  const handleListToMarketplace = (item: Item) => {
    setSelectedItemForListing(item);
    setIsListingModalOpen(true);
  };

  const handleListingCreated = () => {
    showNotification('Item listed to marketplace successfully!', 'success');
    setSelectedItemForListing(null);
  };

  const handleShareItem = (item: Item) => {
    setSelectedItemForSharing(item);
    setIsShareModalOpen(true);
  };

  const handleSharedLinkCreated = () => {
    showNotification('Shared link created successfully!', 'success');
    setIsShareModalOpen(false);
    setSelectedItemForSharing(null);
  };

  const handleNavigate = async (folderId: string) => {
    const targetFolder = breadcrumbs.find(item => item.id === folderId);
    if (targetFolder) {
      const folder = await getItem(targetFolder.id);
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
        const parentFolder = await getItem(parentBreadcrumb.id);
        setCurrentFolder(parentFolder);
      }
    }
  };

  const handleCreateFolder = async (options: CreateFolderOptions) => {
    try {
      const parentId = currentFolder?._id || user.rootFolder;
      
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
    <div className={compact ? "" : "max-w-4xl mx-auto"}>
      <div className={compact ? "" : "bg-amber-100 border-2 border-black brutal-shadow-left p-6"}>
        {!compact && (
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-anton text-3xl">File Explorer</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setIsCreateFolderModalOpen(true)}
                className="button-primary bg-white px-4 py-2 text-base duration-100"
              >
                New Folder
              </button>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="button-primary bg-primary px-4 py-2 text-base duration-100"
              >
                Upload
              </button>
            </div>
          </div>
        )}

        {compact && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setIsCreateFolderModalOpen(true)}
              className="button-primary bg-white px-3 py-1 text-sm duration-100 flex-1"
            >
              New Folder
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="button-primary bg-primary px-3 py-1 text-sm duration-100 flex-1"
            >
              Upload
            </button>
          </div>
        )}

        <div className={`flex items-center gap-4 mb-4 ${compact ? 'bg-gray-50 border border-gray-200 p-2' : 'bg-white border-2 border-black p-3'}`}>
          {currentFolder?._id && (
            <button
              onClick={handleBack}
              className="p-2 bg-primary border-2 border-black button-primary duration-100"
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
          <div className={`flex justify-center items-center ${compact ? 'mt-4' : 'mt-10'} scale-75`}>
            <Loader />
          </div>
        ) : (
          <div className={`grid gap-${compact ? '2' : '4'} ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
            {items.map((item) => (
              <FileItem
                key={item._id}
                item={item}
                onItemClick={handleItemClick}
                onListToMarketplace={handleListToMarketplace}
                onShareItem={handleShareItem}
              />
            ))}
          </div>
        )}
      </div>

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onCreateFolder={handleCreateFolder}
        parentId={currentFolder?._id || user.rootFolder}
      />

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        parentId={currentFolder?._id || ''}
      />

      <CreateListingModal
        isOpen={isListingModalOpen}
        onClose={() => setIsListingModalOpen(false)}
        selectedItem={selectedItemForListing}
        onListingCreated={handleListingCreated}
      />

      {selectedItemForSharing && (
        <CreateSharedLinkModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setSelectedItemForSharing(null);
          }}
          item={selectedItemForSharing}
          onSuccess={handleSharedLinkCreated}
        />
      )}
    </div>
  );
}; 