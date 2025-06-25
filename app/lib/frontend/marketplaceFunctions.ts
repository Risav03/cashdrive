import axios, { AxiosError } from 'axios';
import {
  CreateListingOptions,
  Listing,
  ListingFilters,
  ListingsResponse,
  TransactionFilters,
  TransactionsResponse
} from '../types';
import { IconType } from 'react-icons';
import { FaFile, FaFileArchive, FaFileCode, FaFileCsv, FaFileExcel, FaFilePdf, FaFileWord, FaImage, FaMusic, FaVideo } from 'react-icons/fa';
import { purchaseFromMarketplace } from '@/actions/actions';

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

export function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'inactive':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export const getFileIcon = (mime?: string): IconType => {
  if (!mime) return FaFile;
  
  if (mime.startsWith('image/')) return FaImage;
  if (mime.startsWith('video/')) return FaVideo;
  if (mime.startsWith('audio/')) return FaMusic;
  if (mime.includes('pdf')) return FaFilePdf;
  if (mime.includes('word') || mime.includes('document')) return FaFileWord;
  if (mime.includes('excel') || mime.includes('spreadsheet') || mime.includes('sheet')) return FaFileExcel;
  if (mime.includes('csv')) return FaFileCsv;
  
  if (
    mime.includes('javascript') || 
    mime.includes('typescript') ||
    mime.includes('python') ||
    mime.includes('java') ||
    mime.includes('html') ||
    mime.includes('css') ||
    mime.includes('json') ||
    mime.includes('xml') ||
    mime.includes('text/plain')
  ) return FaFileCode;
  
  if (
    mime.includes('zip') ||
    mime.includes('rar') ||
    mime.includes('tar') ||
    mime.includes('7z') ||
    mime.includes('gzip')
  ) return FaFileArchive;
  
  return FaFile;
};

export async function purchaseListing(listingId: string, wallet:`0x${string}`, affiliateCode?: string): Promise<any> {
  try {
    const res = await purchaseFromMarketplace(wallet, listingId, affiliateCode);
    if (!res || res.status !== 201) {
      throw new Error('Purchase failed - Invalid response');
    }
    return res;
  } catch (error: any) {
    console.error("Purchase error:", error);
    if (error.response?.status === 401) {
      throw new Error('Unauthorized - Please log in');
    }
    if (error.response?.status === 400) {
      throw new Error(error.response.data.error || 'Cannot complete purchase');
    }
    if (error.response?.status === 404) {
      throw new Error('Listing not found');
    }
    throw new Error(error.message || 'Failed to complete purchase');
  }
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<TransactionsResponse> {
  try {
    const params = new URLSearchParams();
    
    if (filters?.type) params.append('type', filters?.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.page) params.append('page', filters.page.toString());

    const response = await axios.get(`/api/transactions?${params.toString()}`);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Unauthorized');
    }
    throw new Error(error.message || 'Failed to fetch transactions');
  }
}

export async function getTransaction(transactionId: string): Promise<any> {
  try {
    const response = await axios.get(`/api/transactions/${transactionId}`);
    console.log("res from purchase", response)
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (error.response && error.response.status === 403) {
      throw new Error('Forbidden - You can only view your own transactions');
    }
    if (error.response && error.response.status === 404) {
      throw new Error('Transaction not found');
    }
    throw new Error(error.message || 'Failed to fetch transaction');
  }
}

export function formatTransactionDate(date: Date | string): string {
  const transactionDate = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(transactionDate);
}

export function getTransactionStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'refunded':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getTransactionTypeColor(type: string): string {
  switch (type) {
    case 'purchase':
      return 'bg-blue-100 text-blue-800';
    case 'sale':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export async function hasUserPurchased(listingId: string): Promise<boolean> {
  try {
    const response = await getTransactions({ type: 'purchases', limit: 100 });
    return response.transactions.some(transaction => 
      transaction.listing?._id === listingId && transaction.status === 'completed'
    );
  } catch (error: any) {
    console.error('Error checking purchase status:', error);
    return false;
  }
}

export async function getAvailableTags(): Promise<string[]> {
  try {
    const response = await axios.get('/api/listings/tags');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching available tags:', error);
    return [];
  }
}

// Blockchain utility functions
export function formatBlockchainAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTransactionHash(hash: string): string {
  if (!hash) return '';
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export function getBlockExplorerUrl(network: string, txHash: string): string {
  const baseUrls: { [key: string]: string } = {
    'base-sepolia': 'https://sepolia.basescan.org/tx/',
    'base': 'https://basescan.org/tx/',
    'ethereum': 'https://etherscan.io/tx/',
    'sepolia': 'https://sepolia.etherscan.io/tx/',
  };
  
  const baseUrl = baseUrls[network] || baseUrls['base-sepolia'];
  return `${baseUrl}${txHash}`;
}

export function getNetworkDisplayName(network: string): string {
  const networkNames: { [key: string]: string } = {
    'base-sepolia': 'Base Sepolia',
    'base': 'Base',
    'ethereum': 'Ethereum',
    'sepolia': 'Sepolia',
  };
  
  return networkNames[network] || network.charAt(0).toUpperCase() + network.slice(1);
}

export function copyToClipboard(text: string, successMessage: string = 'Copied to clipboard!'): void {
  navigator.clipboard.writeText(text).then(() => {
    // You could integrate with a toast notification system here
    console.log(successMessage);
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}
