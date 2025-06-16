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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setUploadType('file');
      setFile(null);
      setUrl('');
      setName('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (uploadType === 'file' && !file) return;
    if (uploadType === 'url' && !url) return;
    
    setIsSubmitting(true);
    try {
      const options: UploadOptions = {
        type: uploadType,
        name: name || (file ? file.name : url),
        parentId,
        ...(uploadType === 'file' ? { file: file || undefined } : { url })
      };

      await onUpload(options);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-5 ">
      <div className="bg-amber-100 border-2 border-black brutal-shadow-left w-96 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b-2 border-black">
          <div className="flex items-center justify-between">
            <h2 className="font-anton text-3xl">UPLOAD</h2>
            <button
              onClick={onClose}
              className="text-2xl hover:text-primary"
            >
              ×
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="font-freeman block mb-2">Upload Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUploadType('file')}
                className={`flex-1 button-primary duration-100 ${
                  uploadType === 'file' ? 'bg-primary' : 'bg-white'
                } py-2`}
              >
                File
              </button>
              <button
                type="button"
                onClick={() => setUploadType('url')}
                className={`flex-1 button-primary duration-100 ${
                  uploadType === 'url' ? 'bg-primary' : 'bg-white'
                } py-2`}
              >
                URL
              </button>
            </div>
          </div>

          {uploadType === 'file' ? (
            <div>
              <label className="font-freeman block mb-2">Choose File</label>
              <div className="relative">
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center file:mr-4 file:py-2 file:px-4 file:border-2 file:border-black file:brutal-shadow-center file:bg-primary file:font-freeman file:text-sm hover:file:brutal-shadow-left file:transition-all"
                />
              </div>
              {file && (
                <p className="mt-2 font-freeman text-sm">
                  Selected: {file.name}
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="font-freeman block mb-2">URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
                placeholder="https://example.com/file"
              />
            </div>
          )}

          <div>
            <label className="font-freeman block mb-2">
              Custom Name <span className="text-sm">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
              placeholder="Enter custom name"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
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
              disabled={isSubmitting || (uploadType === 'file' ? !file : !url)}
              className="button-primary bg-primary px-4 py-2 duration-100"
            >
              {isSubmitting ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 