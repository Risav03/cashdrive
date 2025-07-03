'use client';

import MarketplaceSearch from '@/app/components/MarketplaceSearch';
import MonetizedContentCard from '@/app/components/shared/MonetizedContentCard';
import { getListings, getListingTags } from '@/app/lib/frontend/marketplaceFunctions';
import { PaginationControls } from '@/app/lib/frontend/monetizedContentUtils';
import { Listing, ListingsResponse } from '@/app/lib/types';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import FooterPattern from '../components/global/FooterPattern';
import Loader from '../components/global/Loader';
import { DashboardCard } from '../components/ui/DashboardCard';

export default function MarketplacePage() {
  const [isClient, setIsClient] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
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
    limit: 12,
    search: '',
    tags: [] as string[]
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchListings = useCallback(async () => {
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
  }, [filters]);

  const fetchAvailableTags = async () => {
    try {
      const tags = await getListingTags();
      setAvailableTags(tags);
    } catch (err: any) {
      console.error('Failed to fetch available tags:', err);
    }
  };

  const handleSearch = useCallback((searchTerm: string, tags: string[]) => {
    setFilters(prev => {
      if (prev.search === searchTerm && 
          JSON.stringify(prev.tags) === JSON.stringify(tags)) {
        return prev;
      }
      return {
        ...prev,
        search: searchTerm,
        tags,
        page: 1
      };
    });
  }, []);

  useEffect(() => {
    if (isClient) {
      const timeoutId = setTimeout(() => {
        fetchListings();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [fetchListings, isClient]);

  useEffect(() => {
    fetchAvailableTags();
  }, []);

  const handleSortChange = (sortBy: string) => {
    setFilters(prev => {
      const newSortOrder = prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc';
      
      if (prev.sortBy === sortBy && prev.sortOrder === newSortOrder) {
        return prev;
      }
      
      return {
        ...prev,
        sortBy,
        sortOrder: newSortOrder,
        page: 1
      };
    });
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-white relative">
        <main className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center p-8 rounded-lg">
            <h2 className="heading-text-2 text-6xl font-anton mb-8">
              MARKETPLACE
            </h2>
            <p className="mt-3 max-w-md mx-auto text-xl font-freeman">
              Browse and discover amazing digital products from creators around the world
            </p>
          </div>
        </main>
        <FooterPattern design={1} className='w-[80vw] bottom-0 right-0' />
        <FooterPattern design={1} className='w-[80vw] top-0 left-0 -scale-100' />
      </div>
    );
  }

  if (loading && listings.length === 0) {
    return (
      <div className="min-h-screen bg-white relative">
        <main className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center p-8 rounded-lg">
            <h2 className="heading-text-2 text-6xl font-anton mb-8">
              MARKETPLACE
            </h2>
            <p className="mt-3 max-w-md mx-auto text-xl font-freeman">
              Browse and discover amazing digital products from creators around the world
            </p>
          </div>
          <div className="mt-12 flex justify-center">
            <Loader />
          </div>
        </main>
        <FooterPattern design={1} className='w-[80vw] bottom-0 right-0' />
        <FooterPattern design={1} className='w-[80vw] top-0 left-0 -scale-100' />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white relative">
        <main className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center p-8 rounded-lg">
            <h2 className="heading-text-2 text-6xl font-anton mb-3">
              MARKETPLACE
            </h2>
            <div className="mt-12 bg-red-100 border-2 border-black p-8 brutal-shadow-left">
              <h3 className="text-xl font-freeman mb-4">
                Error loading listings
              </h3>
              <p className="font-freeman mb-6">{error}</p>
              <button
                onClick={fetchListings}
                className="button-primary bg-primary px-8 py-2"
              >
                Try again
              </button>
            </div>
          </div>
        </main>
        <FooterPattern design={1} className='w-[80vw] bottom-0 right-0' />
        <FooterPattern design={1} className='w-[80vw] top-0 left-0 -scale-100' />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative">
      <main className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center p-8 rounded-lg">
          <h2 className="heading-text-2 text-6xl font-anton mb-8">
            MARKETPLACE
          </h2>
          <p className="mt-3 max-w-md mx-auto text-xl font-freeman">
            Browse and discover amazing digital products from creators around the world
          </p>
        </div>
        
        <DashboardCard />
        
        {/* Search Component */}
        <MarketplaceSearch
          onSearch={handleSearch}
          initialSearch={filters.search}
          initialTags={filters.tags}
          availableTags={availableTags}
          isLoading={loading}
        />

        {/* Sort and Filter Controls */}
        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center bg-primary p-6 border-2 border-black brutal-shadow-left">
          <div className="flex items-center space-x-4">
            <span className="text-lg font-freeman">Sort by:</span>
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setFilters(prev => ({ ...prev, sortBy, sortOrder: sortOrder as 'asc' | 'desc', page: 1 }));
              }}
              className="px-4 py-2 bg-white border-2 border-black font-freeman focus:outline-none brutal-shadow-center"
            >
              <option value="createdAt-desc">Newest first</option>
              <option value="createdAt-asc">Oldest first</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="views-desc">Most viewed</option>
            </select>
          </div>
          
          <div className="mt-4 sm:mt-0 text-lg font-freeman">
            {pagination.totalItems} {pagination.totalItems === 1 ? 'listing' : 'listings'} found
            {(filters.search || filters.tags.length > 0) && (
              <span className="ml-2 text-blue-600">
                (filtered)
              </span>
            )}
          </div>
        </div>

        {listings.length === 0 ? (
          <div className="mt-12 text-center bg-amber-100 p-8 border-2 border-black brutal-shadow-left">
            <div className="text-6xl mb-4">
              {(filters.search || filters.tags.length > 0) ? '🔍' : '🛍️'}
            </div>
            <h3 className="text-2xl font-freeman mb-3">
              {(filters.search || filters.tags.length > 0) ? 'No matching listings found' : 'No listings found'}
            </h3>
            <p className="mt-2 text-gray-500 font-freeman">
              {(filters.search || filters.tags.length > 0) 
                ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                : 'Be the first to list an item in the marketplace!'
              }
            </p>
            {(filters.search || filters.tags.length > 0) && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, search: '', tags: [], page: 1 }))}
                className="mt-4 button-primary bg-white px-4 py-2 mx-auto flex items-center duration-100"
              >
                <span className="font-freeman">Clear all filters</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Listings Grid */}
            <div className="mt-8 grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <Link 
                  key={listing._id} 
                  href={`/marketplace/${listing._id}`} 
                  className="block h-full transform transition-transform duration-200 hover:scale-[1.02]"
                >
                  <MonetizedContentCard
                    content={{
                      _id: listing._id,
                      title: listing.title,
                      description: listing.description,
                      type: 'monetized',
                      price: listing.price,
                      item: listing.item,
                      accessCount: listing.views,
                      createdAt: new Date(listing.createdAt)
                    }}
                    showStats={true}
                    className="h-full transition-all duration-200 hover:brutal-shadow-center"
                  />
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.total > 1 && (
              <div className="mt-8">
                <PaginationControls
                  currentPage={pagination.current}
                  totalPages={pagination.total}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </main>
      <FooterPattern design={1} className='w-[80vw] bottom-0 right-0' />
      <FooterPattern design={1} className='w-[80vw] top-0 left-0 -scale-100' />
    </div>
  );
} 