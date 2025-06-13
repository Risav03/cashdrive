import axios from 'axios';
import {
    CreateListingOptions,
    Listing,
    ListingFilters,
    ListingsResponse,
    UpdateListingOptions
} from '../types';

export async function createListing(options: CreateListingOptions): Promise<Listing> {
  try {
    const response = await axios.post('/api/listings', options, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (error.response && error.response.status === 400) {
      throw new Error(error.response.data.error || 'Invalid listing data');
    }
    throw new Error(error.message || 'Failed to create listing');
  }
}


export async function getListings(filters: ListingFilters = {}): Promise<ListingsResponse> {
  try {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.sellerId) params.append('sellerId', filters.sellerId);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.page) params.append('page', filters.page.toString());
    
    const url = `/api/listings${params.toString() ? '?' + params.toString() : ''}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Unauthorized');
    }
    throw new Error(error.message || 'Failed to fetch listings');
  }
}


export async function getListing(listingId: string, incrementView: boolean = true): Promise<Listing> {
  try {
    const url = incrementView 
      ? `/api/listings/${listingId}?incrementView=true`
      : `/api/listings/${listingId}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (error.response && error.response.status === 404) {
      throw new Error('Listing not found');
    }
    throw new Error(error.message || 'Failed to fetch listing');
  }
}


export async function updateListing(
  listingId: string, 
  updates: UpdateListingOptions
): Promise<Listing> {
  try {
    const response = await axios.put(`/api/listings/${listingId}`, updates, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (error.response && error.response.status === 403) {
      throw new Error('Forbidden - You can only update your own listings');
    }
    if (error.response && error.response.status === 404) {
      throw new Error('Listing not found');
    }
    throw new Error(error.message || 'Failed to update listing');
  }
}


export async function deleteListing(listingId: string): Promise<{ message: string }> {
  try {
    const response = await axios.delete(`/api/listings/${listingId}`);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (error.response && error.response.status === 403) {
      throw new Error('Forbidden - You can only delete your own listings');
    }
    if (error.response && error.response.status === 404) {
      throw new Error('Listing not found');
    }
    throw new Error(error.message || 'Failed to delete listing');
  }
}


export async function getMyListings(
  status: string = 'active',
  page: number = 1,
  limit: number = 20
): Promise<ListingsResponse> {
  try {
    const params = new URLSearchParams({
      status,
      page: page.toString(),
      limit: limit.toString(),
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    
    const response = await axios.get(`/api/listings?${params.toString()}`);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Unauthorized');
    }
    throw new Error(error.message || 'Failed to fetch your listings');
  }
}


export async function markListingAsSold(listingId: string): Promise<Listing> {
  return updateListing(listingId, { status: 'sold' });
}

export async function markListingAsInactive(listingId: string): Promise<Listing> {
  return updateListing(listingId, { status: 'inactive' });
}

export async function reactivateListing(listingId: string): Promise<Listing> {
  return updateListing(listingId, { status: 'active' });
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}


export function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'sold':
      return 'bg-gray-100 text-gray-800';
    case 'inactive':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getFileIcon(mimeType?: string): string {
  if (!mimeType) return '📄';
  
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎥';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
  
  return '📄';
} 