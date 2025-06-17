'use client';

import { useState, useEffect } from 'react';
import { CreateFolderOptions } from '@/app/lib/types';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (options: CreateFolderOptions) => Promise<void>;
  parentId: string | null;
}

export const CreateFolderModal = ({ isOpen, onClose, onCreateFolder, parentId }: CreateFolderModalProps) => {
  const [folderName, setFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFolderName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateFolder({
        name: folderName.trim(),
        parentId
      });
      setFolderName('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-amber-100 border-2 border-black brutal-shadow-left p-6 w-96">
        <h2 className="font-anton text-3xl mb-6">Create Folder</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="font-freeman block mb-2">Folder Name</label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
              placeholder="Enter folder name"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="button-primary bg-white px-4 py-2 duration-100"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button-primary bg-primary px-4 py-2 duration-100"
              disabled={isSubmitting || !folderName.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 