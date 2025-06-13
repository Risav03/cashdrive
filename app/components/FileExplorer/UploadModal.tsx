'use client';

import { UploadOptions } from '@/app/lib/types';
import { useEffect, useState } from 'react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (options: UploadOptions) => Promise<void>;
  parentId: string;
}

export const UploadModal = ({ isOpen, onClose, onUpload, parentId }: UploadModalProps) => {
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');

  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setUploadType('file');
      setFile(null);
      setUrl('');
      setName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (uploadType === 'file' && !file) return;
    if (uploadType === 'url' && !url) return;
    
    const options: UploadOptions = {
      type: uploadType,
      name: name || (file ? file.name : url),
      parentId,
      ...(uploadType === 'file' ? { file: file || undefined } : { url })
    };

    await onUpload(options);
    
    // Reset form state after successful upload
    setUploadType('file');
    setFile(null);
    setUrl('');
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-96">
        <h2 className="text-xl font-bold mb-4">Upload</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2">Upload Type</label>
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value as 'file' | 'url')}
              className="w-full p-2 border rounded"
            >
              <option value="file">File</option>
              <option value="url">URL</option>
            </select>
          </div>

          {uploadType === 'file' ? (
            <div className="mb-4">
              <label className="block mb-2">File</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full p-2 border rounded"
              />
            </div>
          ) : (
            <div className="mb-4">
              <label className="block mb-2">URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="https://example.com/file"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block mb-2">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Custom name"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={uploadType === 'file' ? !file : !url}
            >
              Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 