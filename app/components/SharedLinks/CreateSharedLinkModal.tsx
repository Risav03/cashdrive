'use client';

import { copyLinkToClipboard, createSharedLink, generateShareableUrl } from '@/app/lib/frontend/sharedLinkFunctions';
import { Item } from '@/app/lib/types';
import { createElement, useState } from 'react';
import { getFileIcon } from '@/app/lib/frontend/explorerFunctions';
import { FaFolder } from 'react-icons/fa';

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
        type: formData?.type,
        title: formData.title,
        description: formData.description
      };

      if (formData?.type === 'monetized') {
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
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-amber-100 border-2 border-black brutal-shadow-left w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b-2 border-black">
          <div className="flex justify-between items-center">
            <h2 className="font-anton text-3xl">
              {displayUrl ? 'Link Created!' : 'Create Shared Link'}
            </h2>
            <button
              onClick={handleClose}
              className="text-2xl hover:text-primary"
            >
              ×
            </button>
          </div>
        </div>

        {displayUrl ? (
          <div className="p-6 space-y-6">
            <div className="bg-primary border-2 border-black p-4 brutal-shadow-center">
              <p className="font-freeman mb-4">Your link is ready to share!</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border-2 border-black font-freeman"
                />
                <button
                  onClick={handleCopyLink}
                  className="button-primary bg-white px-4 py-2"
                >
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="button-primary bg-primary px-4 py-2"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="font-freeman block mb-2">Item to Share</label>
              <div className="p-4 bg-white border-2 border-black brutal-shadow-left">
                <div className="flex items-center gap-3">
                  <div className="text-3xl flex-shrink-0">
                    {item?.type === 'folder' 
                      ? <FaFolder className="w-6 h-6" />
                      : createElement(getFileIcon(item?.mimeType), { className: "w-6 h-6" })
                    }
                  </div>
                  <div className="min-w-0"> {/* prevent text overflow */}
                    <div className="font-freeman truncate">{item.name}</div>
                    <div className="font-freeman text-xs">
                      <span className="px-2 py-0.5 bg-primary border-2 border-black brutal-shadow-center inline-block">
                        {item?.type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="font-freeman block mb-2">Link Type</label>
              <div className="flex gap-2">
                <label 
                  className={`
                    flex-1 border-2 border-black p-4 cursor-pointer transition-all
                    ${formData?.type === 'public' 
                      ? 'bg-primary button-primary-pressed' 
                      : 'bg-white button-primary duration-100'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="type"
                    value="public"
                    checked={formData?.type === 'public'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'public' })}
                    className="sr-only" // Hide the default radio button
                  />
                  <div className="space-y-1">
                    <div className="font-freeman text-lg">Public</div>
                    <div className="font-freeman text-sm">
                      Anyone can access for free
                    </div>
                  </div>
                </label>

                <label 
                  className={`
                    flex-1 border-2 border-black p-4 cursor-pointer transition-all
                    ${formData?.type === 'monetized' 
                      ? 'bg-primary button-primary-pressed' 
                      : 'bg-white button-primary duration-100'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="type"
                    value="monetized"
                    checked={formData?.type === 'monetized'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'monetized' })}
                    className="sr-only" // Hide the default radio button
                  />
                  <div className="space-y-1">
                    <div className="font-freeman text-lg">Monetized</div>
                    <div className="font-freeman text-sm">
                      Requires payment to access
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="font-freeman block mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
                required
                maxLength={100}
              />
            </div>

            <div>
              <label className="font-freeman block mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
                rows={3}
                maxLength={500}
                placeholder="Optional description for your shared link"
              />
            </div>

            {formData?.type === 'monetized' && (
              <div>
                <label className="font-freeman block mb-2">Price (USD) *</label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="font-freeman block mb-2">Expiration Date (Optional)</label>
              <input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="font-freeman text-sm mt-1">Leave empty for permanent link</p>
            </div>

            <div className="flex justify-end gap-2 pt-6">
              <button
                type="button"
                onClick={handleClose}
                className="button-primary bg-white px-4 py-2 duration-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.title}
                className="button-primary bg-primary px-4 py-2 duration-100"
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