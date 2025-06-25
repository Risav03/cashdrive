'use client';

import { createListing } from '@/app/lib/frontend/marketplaceFunctions';
import { CreateListingOptions, Item } from '@/app/lib/types';
import React, { useState } from 'react';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: Item | null;
  onListingCreated?: () => void;
}

export default function CreateListingModal({ 
  isOpen, 
  onClose, 
  selectedItem, 
  onListingCreated 
}: CreateListingModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    tags: '',
    affiliateEnabled: false,
    defaultCommissionRate: 10
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && selectedItem) {
      setFormData({
        title: selectedItem.name,
        description: '',
        price: '',
        tags: '',
        affiliateEnabled: false,
        defaultCommissionRate: 10
      });
      setError(null);
    }
  }, [isOpen, selectedItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItem) return;

    setLoading(true);
    setError(null);

    try {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        throw new Error('Please enter a valid price greater than 0');
      }

      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const listingData: CreateListingOptions = {
        itemId: selectedItem._id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        price,
        tags: tags.length > 0 ? tags : undefined,
        affiliateEnabled: formData.affiliateEnabled,
        defaultCommissionRate: formData.affiliateEnabled ? formData.defaultCommissionRate : 0
      };

      await createListing(listingData);
      
      setFormData({
        title: '',
        description: '',
        price: '',
        tags: '',
        affiliateEnabled: false,
        defaultCommissionRate: 10
      });
      onClose();
      onListingCreated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseFloat(value) || 0 : 
              value 
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-amber-100 border-2 border-black brutal-shadow-left w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b-2 border-black">
          <div className="flex items-center justify-between">
            <h2 className="font-anton text-3xl">Create Listing</h2>
            <button
              onClick={onClose}
              className="text-2xl hover:text-primary"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {selectedItem && (
            <div className="bg-white border-2 border-black p-4 brutal-shadow-center">
              <p className="font-freeman">Selected file:</p>
              <p className="font-freeman text-lg">{selectedItem.name}</p>
              <p className="font-freeman text-sm">Type: {selectedItem?.type}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border-2 border-black p-4 brutal-shadow-left">
              <p className="font-freeman text-red-900">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="font-freeman block mb-2">Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
                placeholder="Enter listing title"
                required
              />
            </div>

            <div>
              <label className="font-freeman block mb-2">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
                rows={4}
                placeholder="Describe your listing"
                required
              />
            </div>

            <div>
              <label className="font-freeman block mb-2">Price (USD) *</label>
              <div className="relative">
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-freeman block mb-2">Tags (optional)</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
                placeholder="design, template, pdf"
              />
              <p className="font-freeman text-sm mt-1">Separate tags with commas</p>
            </div>

            <div className="bg-white border-2 border-black p-4 brutal-shadow-center space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="affiliateEnabled"
                  name="affiliateEnabled"
                  checked={formData.affiliateEnabled}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <label htmlFor="affiliateEnabled" className="font-freeman">
                  Enable Affiliate Program
                </label>
              </div>
              
              {formData.affiliateEnabled && (
                <div>
                  <label className="font-freeman block mb-2">Default Commission Rate (%)</label>
                  <input
                    type="number"
                    name="defaultCommissionRate"
                    value={formData.defaultCommissionRate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-[#FFD000]"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <p className="font-freeman text-sm mt-1">
                    Default commission rate for new affiliates
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="button-primary bg-white px-4 py-2 duration-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="button-primary bg-primary px-4 py-2 duration-100"
            >
              {loading ? 'Creating...' : 'Create Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 