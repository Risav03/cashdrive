'use client';

import { useState, useEffect } from 'react';
import { CreateFolderOptions } from '@/app/lib/types';
import { Input } from '../ui/Input';

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/10 glass shadow-2xl shadow-black/20 p-6 rounded-2xl w-96 text-white/80">
        <h2 className="text-2xl font-bold mb-6 text-white/90">Create New Folder</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            className="glass"
            placeholder="Enter folder name"
            label="Folder Name"
            autoFocus
          />

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-bold rounded-full cursor-pointer text-white/70 bg-black/20 hover:bg-black/30 hover:shadow-lg shadow-black/20 hover:translate-y-[-2px] duration-200 glass disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-bold rounded-full cursor-pointer text-white bg-black/40 hover:bg-black/30 hover:shadow-lg shadow-black/20 hover:translate-y-[-2px] duration-200 glass disabled:opacity-50"
              disabled={isSubmitting || !folderName.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 