'use client';

import { copyLinkToClipboard, createSharedLink, generateShareableUrl } from '@/app/lib/frontend/sharedLinkFunctions';
import { Item } from '@/app/lib/types';
import { useState } from 'react';

interface CreateSharedLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  onSuccess?: () => void;
}

export default function CreateSharedLinkModal({ 
  isOpen, 
  onClose, 
  item, 
  onSuccess 
}: CreateSharedLinkModalProps) {
  const [formData, setFormData] = useState({
    type: 'public' as 'public' | 'monetized',
    title: item?.name || '',
    description: '',
    price: 0,
    expiresAt: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [createdLinkId, setCreatedLinkId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const linkData: any = {
        itemId: item._id,
        type: formData.type,
        title: formData.title,
        description: formData.description
      };

      if (formData.type === 'monetized') {
        linkData.price = formData.price;
      }

      if (formData.expiresAt) {
        linkData.expiresAt = new Date(formData.expiresAt);
      }

      const sharedLink = await createSharedLink(linkData);
      setCreatedLinkId(sharedLink.linkId);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdLinkId) return;
    
    try {
      await copyLinkToClipboard(createdLinkId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      alert('Failed to copy link to clipboard');
    }
  };

  const handleClose = () => {
    setFormData({
      type: 'public',
      title: item?.name || '',
      description: '',
      price: 0,
      expiresAt: ''
    });
    setCreatedLinkId(null);
    setCopySuccess(false);
    onClose();
  };

  if (!isOpen || !item) return null;

  // Generate the display URL only when needed
  const displayUrl = createdLinkId ? generateShareableUrl(createdLinkId) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {displayUrl ? 'Link Created!' : 'Create Shared Link'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {displayUrl ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium mb-2">
                Your shared link has been created successfully!
              </p>
                              <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={displayUrl}
                    readOnly
                    className="flex-1 p-2 border border-gray-300 rounded text-sm"
                  />
                <button
                  onClick={handleCopyLink}
                  className={`px-3 py-2 rounded text-sm font-medium ${
                    copySuccess
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item to Share
              </label>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">
                    {item.type === 'folder' ? '📁' : '📄'}
                  </span>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-sm text-gray-500">
                    ({item.type})
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="type"
                    value="public"
                    checked={formData.type === 'public'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'public' })}
                    className="mr-2"
                  />
                  <span className="font-medium text-green-600">Public</span>
                  <span className="text-sm text-gray-500 ml-2">
                    - Anyone can access for free
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="type"
                    value="monetized"
                    checked={formData.type === 'monetized'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'monetized' })}
                    className="mr-2"
                  />
                  <span className="font-medium text-blue-600">Monetized</span>
                  <span className="text-sm text-gray-500 ml-2">
                    - Requires payment to access
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                maxLength={500}
                placeholder="Optional description for your shared link"
              />
            </div>

            {formData.type === 'monetized' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (USD) *
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="0.00"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for permanent link
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.title}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 