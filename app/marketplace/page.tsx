'use client';

import { formatPrice, getFileIcon, getListings, getStatusColor } from '@/app/lib/frontend/marketplaceFunctions';
import { Listing, ListingsResponse } from '@/app/lib/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalItems: 0
  });
  const [filters, setFilters] = useState({
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
    page: 1,
    limit: 12
  });

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: ListingsResponse = await getListings({
        status: 'active',
        ...filters
      });
      setListings(response.listings);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [filters]);

  const handleSortChange = (sortBy: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc',
      page: 1
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  if (loading && listings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              Marketplace
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Browse and discover amazing digital products from creators around the world
            </p>
          </div>
          <div className="mt-12 flex justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              Marketplace
            </h1>
            <div className="mt-12 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error loading listings
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={fetchListings}
                      className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Marketplace
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Browse and discover amazing digital products from creators around the world
          </p>
        </div>

        {/* Sort and Filter Controls */}
        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-900">Sort by:</span>
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setFilters(prev => ({ ...prev, sortBy, sortOrder: sortOrder as 'asc' | 'desc', page: 1 }));
              }}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="createdAt-desc">Newest first</option>
              <option value="createdAt-asc">Oldest first</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="views-desc">Most viewed</option>
            </select>
          </div>
          
          <div className="mt-4 sm:mt-0 text-sm text-gray-600">
            {pagination.totalItems} {pagination.totalItems === 1 ? 'listing' : 'listings'} found
          </div>
        </div>

        {listings.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="text-6xl mb-4">🛍️</div>
            <h3 className="text-lg font-medium text-gray-900">No listings found</h3>
            <p className="mt-2 text-gray-500">
              Be the first to list an item in the marketplace!
            </p>
          </div>
        ) : (
          <>
            {/* Listings Grid */}
            <div className="mt-8 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((listing) => (
                <Link
                  key={listing._id}
                  href={`/marketplace/${listing._id}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 group"
                >
                  <div className="aspect-w-16 aspect-h-12 bg-gray-200 flex items-center justify-center">
                    <span className="text-4xl">
                      {getFileIcon(listing.item.mimeType)}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(listing.status)}`}>
                        {listing.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {listing.views} {listing.views === 1 ? 'view' : 'views'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 line-clamp-2">
                      {listing.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {listing.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">
                        {formatPrice(listing.price)}
                      </span>
                      <span className="text-xs text-gray-500">
                        by {listing.seller.name}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      File: {listing.item.name}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.total > 1 && (
              <div className="mt-8 flex items-center justify-center">
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(pagination.current - 1)}
                    disabled={pagination.current === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: pagination.total }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === pagination.current
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(pagination.current + 1)}
                    disabled={pagination.current === pagination.total}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
} 