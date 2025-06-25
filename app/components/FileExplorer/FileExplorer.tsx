'use client';

import { useApp } from '@/app/context/AppContext';
import { createFolder, deleteItem, getBreadcrumbPath, getItem, uploadItem } from '@/app/lib/frontend/explorerFunctions';
import { BreadcrumbItem, CreateFolderOptions, Item, UploadOptions } from '@/app/lib/types';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
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
  const { showNotification } = useApp();
  const { data: session, status } = useSession();
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
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
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

  // Load root folder when session is ready
  useEffect(() => {
    if (!session?.user?.rootFolder || currentFolder) return;

    const loadRootFolder = async () => {
      try {
        const rootFolder = await getItem(session.user.rootFolder!);
        setCurrentFolder(rootFolder);
      } catch (error) {
        console.error('Error loading root folder:', error);
        showNotification('Failed to load root folder', 'error');
      }
    };
    
    loadRootFolder();
  }, [session?.user?.rootFolder]);

  const loadFolderContents = useCallback(async (page: number = currentPage) => {
    if (!currentFolder?._id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/items?parentId=${currentFolder._id}&page=${page}&limit=${itemsPerPage}`);
      if (!response.ok) {
        throw new Error('Failed to load folder contents');
      }
      const data = await response.json();
      setItems(data.items);
      const breadcrumbsPath = await getBreadcrumbPath(currentFolder._id);
      setBreadcrumbs(breadcrumbsPath);
      setPagination(prev => ({
        ...prev,
        current: page,
        total: Math.ceil(data.totalItems / itemsPerPage),
        count: data.items.length,
        totalItems: data.totalItems,
        hasNextPage: page * itemsPerPage < data.totalItems,
        hasPreviousPage: page > 1,
        nextCursor: data.nextCursor
      }));
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.message || 'Failed to load folder contents');
      console.error('Error loading folder contents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentFolder?._id, itemsPerPage]);

  useEffect(() => {
    if (currentFolder?._id) {
      loadFolderContents(currentPage);
    }
  }, [currentFolder?._id, currentPage, loadFolderContents]);

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

  if (status === 'loading') {
    return (
      <div className='flex justify-center items-center mt-10'>
        <Loader />
      </div>
    );
  }

  if (!session?.user) {
    return <div>Please log in to view your files.</div>;
  }

  const handleItemClick = (item: Item) => {
    if (item?.type === 'folder') {
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

      
      if (!parentBreadcrumb && session?.user.rootFolder) {
        const root = await getItem(session.user.rootFolder);
        setCurrentFolder(root);
      } else if (parentBreadcrumb) {
        const parentFolder = await getItem(parentBreadcrumb.id);
        setCurrentFolder(parentFolder);
      }
    }
  };

  const handleCreateFolder = async (options: CreateFolderOptions) => {
    try {
      const parentId = currentFolder?._id || (session.user.rootFolder ?? null);
      
      await createFolder({
        ...options,
        parentId
      });
      
      await loadFolderContents(currentPage);
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const handleDeleteItem = async (item: Item) => {
    try {
      await deleteItem(item._id);
      await loadFolderContents(currentPage);
    } catch (error) {
      console.error('Failed to delete item:', error);
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
                  onDeleteItem={handleDeleteItem}
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
        parentId={currentFolder?._id || (session.user.rootFolder ?? null)}
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