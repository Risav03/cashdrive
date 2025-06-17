'use client';

import { useApp } from '@/app/context/AppContext';
import { FileViewerModal } from './FileExplorer/FileViewerModal';

export const FileViewer = () => {
  const { viewerItem, isViewerOpen, closeFileViewer } = useApp();

  if (!viewerItem || !isViewerOpen) return null;

  return (
    <FileViewerModal
      isOpen={isViewerOpen}
      onClose={closeFileViewer}
      item={viewerItem}
    />
  );
}; 