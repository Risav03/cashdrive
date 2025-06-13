'use client';

import { getListing, updateListing } from '@/app/lib/frontend/marketplaceFunctions';
import { Listing, UpdateListingOptions } from '@/app/lib/types';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

export default function EditListingPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    status: 'active' as 'active' | 'sold' | 'inactive',
    tags: ''
  });

  const listingId = params.id as string;

  const fetchListing = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getListing(listingId, false); // Don't increment view for editing
      setListing(data);
      
      // Populate form
      setFormData({
        title: data.title,
        description: data.description,
        price: data.price.toString(),
        status: data.status,
        tags: data.tags.join(', ')
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch listing');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!listing) return;

    setSaving(true);
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

      const updateData: UpdateListingOptions = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price,
        status: formData.status,
        tags: tags.length > 0 ? tags : []
      };
      await updateListing(listingId, updateData);
      router.push(`/marketplace/${listingId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update listing');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (listingId) {
      fetchListing();
    }
  }, [listingId]);

  // Check if user is owner
  useEffect(() => {
    if (listing && session?.user?.id !== listing.seller._id) {
      router.push(`/marketplace/${listingId}`);
    }
  }, [listing, session, listingId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading listing
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <Link
                    href={`/marketplace/${listingId}`}
                    className="bg-gray-100 px-3 py-2 rounded-md text-sm font-medium text-gray-800 hover:bg-gray-200"
                  >
                    Back to Listing
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Listing not found</h1>
            <Link
              href="/marketplace"
              className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Back to Marketplace
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 ">
      <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <nav className="mb-8">
          <Link
            href={`/marketplace/${listingId}`}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Back to Listing
          </Link>
        </nav>

        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Edit Listing</h1>
            <p className="mt-1 text-sm text-gray-600">
              File: {listing.item.name}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6">
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-6 text-black">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  maxLength={1000}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                />
                <p className="text-xs text-black mt-1">
                  {formData.description.length}/1000 characters
                </p>
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Price (USD) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-black sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    min="0.01"
                    step="0.01"
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="sold">Sold</option>
                </select>
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags <span className="text-black">(optional)</span>
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., design, template, pdf (comma-separated)"
                />
                <p className="text-xs text-black mt-1">
                  Separate multiple tags with commas
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <Link
                href={`/marketplace/${listingId}`}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving || !formData.title.trim() || !formData.description.trim() || !formData.price.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
} 