'use client';

import FooterPattern from '@/app/components/global/FooterPattern';
import Loader from '@/app/components/global/Loader';
import { getListing, updateListing } from '@/app/lib/frontend/marketplaceFunctions';
import { Listing, UpdateListingOptions } from '@/app/lib/types';
import loadericon from '@/assets/loader_2.svg';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

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
    status: 'active' as 'active' | 'inactive',
    tags: ''
  });

  const listingId = params.id as string;

  const fetchListing = useCallback(async () => {
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
  }, [listingId]);

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
  }, [listingId, fetchListing]);

  // Check if user is owner
  useEffect(() => {
    if (listing && session?.user?.id !== listing.seller._id) {
      router.push(`/marketplace/${listingId}`);
    }
  }, [listing, session, listingId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white relative">
        <main className="max-w-4xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h2 className="heading-text-2 text-6xl font-anton mb-8">LOADING</h2>
            <div className='flex justify-center items-center mt-10'>
              <Loader />
            </div>
          </div>
        </main>
        <FooterPattern design={1} className=' w-[80vw] bottom-0 right-0 ' />
      <FooterPattern design={1} className=' w-[80vw] top-0 left-0 -scale-100 ' />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-100 border-2 border-black rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-freeman text-black">
                  Error loading listing
                </h3>
                <div className="mt-2 text-sm font-freeman text-black">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <Link
                    href={`/marketplace/${listingId}`}
                    className="button-primary bg-primary px-3 py-2"
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
      <div className="min-h-screen bg-white">
        <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="heading-text-2 text-5xl font-anton">Listing not found</h1>
            <Link
              href="/marketplace"
              className="mt-4 inline-block button-primary bg-primary px-4 py-2"
            >
              Back to Marketplace
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative">
      <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Navigation */}
        <nav className="mb-8">
          <Link
            href={`/marketplace/${listingId}`}
            className="button-primary bg-primary px-4 py-2 inline-flex items-center"
          >
            ← Back to Listing
          </Link>
        </nav>

        <div className="bg-amber-100 border-2 border-black brutal-shadow-left p-8">
          <div className="border-b-2 border-black pb-4">
            <h1 className="heading-text-2 text-5xl font-anton text-center">EDIT LISTING</h1>
            <p className="mt-1 text-center font-freeman">
              File: {listing.item.name}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="bg-red-100 border-2 border-black p-4" role="alert">
                <span className="block font-freeman">{error}</span>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="font-freeman block mb-2">
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
                  className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
                />
              </div>

              <div>
                <label htmlFor="description" className="font-freeman block mb-2">
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
                  className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center resize-vertical"
                />
                <p className="text-xs font-freeman mt-1">
                  {formData.description.length}/1000 characters
                </p>
              </div>

              <div>
                <label htmlFor="price" className="font-freeman block mb-2">
                  Price (USD) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="font-freeman">$</span>
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
                    className="w-full pl-7 pr-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="status" className="font-freeman block mb-2">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label htmlFor="tags" className="font-freeman block mb-2">
                  Tags <span className="font-freeman">(optional)</span>
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
                  placeholder="e.g., design, template, pdf (comma-separated)"
                />
                <p className="text-xs font-freeman mt-1">
                  Separate multiple tags with commas
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <Link
                href={`/marketplace/${listingId}`}
                className="button-primary bg-white px-4 py-2"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving || !formData.title.trim() || !formData.description.trim() || !formData.price.trim()}
                className="button-primary bg-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className='flex gap-2 items-center justify-center'>
                    <Image src={loadericon} alt="loader" className='w-6 h-6 animate-spin' />
                    Saving...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
      <FooterPattern design={1} className='w-[80vw] bottom-0 right-0' />
      <FooterPattern design={1} className='w-[80vw] top-0 left-0 -scale-100' />
    </div>
  );
} 