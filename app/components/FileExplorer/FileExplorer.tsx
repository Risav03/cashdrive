'use client';

import { useApp } from '@/app/context/AppContext';
import { createFolder, getBreadcrumbPath, getItem, getItemsByParentId, uploadItem } from '@/app/lib/frontend/explorerFunctions';
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
  
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalItems: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    nextCursor: null as string | null,
    limit: 20
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    async function loadRootFolder() {
      if (!user || !user.rootFolder) return;
      
      setIsLoading(true);
      try {
        const root = await getItem(user.rootFolder);
        setCurrentFolder(root);
        const response = await getItemsByParentId(root._id, {
          page: 1,
          limit: itemsPerPage
        });
        
        const sortedItems = response.items.sort((a, b) => {

          if (a.type === 'folder' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'folder') return 1;
          
          // Then sort by date (newest first)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setItems(sortedItems);
        setPagination(response.pagination);
        setCurrentPage(1);
        setBreadcrumbs([]);
      } catch (error) {
        console.error('Failed to load root folder:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadRootFolder();
  }, [user, itemsPerPage]);

  const loadFolderContents = async (page: number = 1) => {
    if (!currentFolder || !user) return;
    
    setIsLoading(true);
    try {
      const response = await getItemsByParentId(currentFolder._id, {
        page,
        limit: itemsPerPage
      });
      
      const sortedItems = response.items.sort((a, b) => {
        // First, separate folders and files
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        
        // Then sort by date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setItems(sortedItems);
      setPagination(response.pagination);
      setCurrentPage(page);
      
      if (page === 1) {
        const path = await getBreadcrumbPath(currentFolder._id);
        setBreadcrumbs(path);
      }
    } catch (error) {
      console.error('Failed to load folder contents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentFolder) {
      loadFolderContents(1);
    }
  }, [currentFolder, user]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.total) {
      loadFolderContents(newPage);
    }
  };

  const handlePreviousPage = () => {
    if (pagination.hasPreviousPage) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.hasNextPage) {
      handlePageChange(currentPage + 1);
    }
  };

  if (isLoadingUser) {
    return (
      <div className='flex justify-center items-center mt-10'>
        <Loader />
      </div>
    );
  }

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
      await loadFolderContents(currentPage);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleBack = async () => {
    if (currentFolder && breadcrumbs.length > 0) {
      const parentBreadcrumb = breadcrumbs[breadcrumbs.length - 2];
      
      if (!parentBreadcrumb && user?.rootFolder) {
        const root = await getItem(user.rootFolder);
        setCurrentFolder(root);
      } else if (parentBreadcrumb) {
        const parentFolder = await getItem(parentBreadcrumb.id);
        setCurrentFolder(parentFolder);
      }
    }
  };

  const handleCreateFolder = async (options: CreateFolderOptions) => {
    try {
      const parentId = currentFolder?._id || user?.rootFolder;
      
      await createFolder({
        ...options,
        parentId
      });
      
      await loadFolderContents(currentPage);
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  return (
    <div className={compact ? 'p-0' : 'p-6'}>
      <div className={compact ? '' : 'max-w-7xl mx-auto'}>
        {!compact && (
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-freeman">Files</h1>
            <div className="flex gap-4">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-primary border-2 border-black brutal-shadow-left hover:translate-y-1 hover:brutal-shadow-center px-6 py-3 font-freeman transition-all"
              >
                Upload
              </button>
              <button
                onClick={() => setIsCreateFolderModalOpen(true)}
                className="bg-white border-2 border-black brutal-shadow-left hover:translate-y-1 hover:brutal-shadow-center px-6 py-3 font-freeman transition-all"
              >
                New Folder
              </button>
            </div>
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
          
          {/* Pagination Info */}
          {pagination.totalItems > 0 && (
            <div className="ml-auto text-sm font-freeman text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, pagination.totalItems)} of {pagination.totalItems} items
            </div>
          )}
        </div>

        {isLoading ? (
          <div className={`flex justify-center items-center ${compact ? 'mt-4' : 'mt-10'} scale-75`}>
            <Loader />
          </div>
        ) : (
          <>
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

            {/* Pagination Controls */}
            {pagination.totalItems > itemsPerPage && (
              <div className="flex items-center justify-between mt-6 p-4 bg-white border-2 border-black">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handlePreviousPage}
                    disabled={!pagination.hasPreviousPage}
                    className={`px-4 py-2 border-2 border-black font-freeman transition-all ${
                      pagination.hasPreviousPage
                        ? 'bg-white hover:bg-gray-100 brutal-shadow-left hover:translate-y-1 hover:brutal-shadow-center'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, pagination.total) }, (_, i) => {
                      const pageNum = Math.max(1, currentPage - 2) + i;
                      if (pageNum > pagination.total) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 border-2 border-black font-freeman transition-all ${
                            pageNum === currentPage
                              ? 'bg-primary'
                              : 'bg-white hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={handleNextPage}
                    disabled={!pagination.hasNextPage}
                    className={`px-4 py-2 border-2 border-black font-freeman transition-all ${
                      pagination.hasNextPage
                        ? 'bg-white hover:bg-gray-100 brutal-shadow-left hover:translate-y-1 hover:brutal-shadow-center'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                </div>
                
                <div className="text-sm font-freeman text-gray-600">
                  Page {currentPage} of {pagination.total}
                </div>
              </div>
            )}
          </>
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