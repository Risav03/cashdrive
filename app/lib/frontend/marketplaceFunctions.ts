import axios, { AxiosError } from 'axios';
import {
  CreateListingOptions,
  Listing,
  ListingFilters,
  ListingsResponse
} from '../types';

const API_ENDPOINTS = {
  listings: '/api/listings',
  tags: '/api/listings/tags'
} as const;

export function handleApiError(error: unknown, defaultMessage: string): never {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message || error.message;
    throw new Error(message);
  }
  throw new Error(defaultMessage);
}

export async function createListing(options: CreateListingOptions): Promise<Listing> {
  try {
    const response = await axios.post(API_ENDPOINTS.listings, options);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to create listing');
  }
}

export async function getListings(filters: ListingFilters = {}): Promise<ListingsResponse> {
  try {
    const params = new URLSearchParams(
      Object.entries(filters)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    );

    const response = await axios.get(`${API_ENDPOINTS.listings}?${params.toString()}`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to fetch listings');
  }
}

export async function getListing(listingId: string, shouldIncrementView: boolean = true): Promise<Listing> {
  try {
    const response = await axios.get(`${API_ENDPOINTS.listings}/${listingId}`, {
      params: {
        incrementView: shouldIncrementView
      }
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to fetch listing');
  }
}

export async function updateListing(listingId: string, updates: Partial<Listing>): Promise<Listing> {
  try {
    const response = await axios.patch(`${API_ENDPOINTS.listings}/${listingId}`, updates);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to update listing');
  }
}

export async function deleteListing(listingId: string): Promise<void> {
  try {
    await axios.delete(`${API_ENDPOINTS.listings}/${listingId}`);
  } catch (error) {
    handleApiError(error, 'Failed to delete listing');
  }
}

export async function getListingTags(): Promise<string[]> {
  try {
    const response = await axios.get(API_ENDPOINTS.tags);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to fetch listing tags');
  }
}

// UI utilities
export function getListingStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    draft: 'bg-gray-100 text-gray-800',
    archived: 'bg-red-100 text-red-800',
    default: 'bg-gray-100 text-gray-800'
  };
  return colorMap[status] || colorMap.default;
}

export function formatListingPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
}

export function formatListingDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date));
} 