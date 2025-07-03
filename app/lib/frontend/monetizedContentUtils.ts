import { formatDistanceToNow } from 'date-fns';
export { default as PaginationControls } from '@/app/components/shared/PaginationControls';

export interface MonetizedContentResponse<T> {
  content: T;
  canAccess: boolean;
  requiresPayment: boolean;
  requiresAuth?: boolean;
  alreadyPaid?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    current: number;
    total: number;
    count: number;
    totalItems: number;
  };
}

export function formatDate(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function generateShareableUrl(id: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
  return `${baseUrl}/shared/${id}`;
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    throw new Error('Failed to copy to clipboard');
  }
}

export function getContentTypeColor(type: 'public' | 'monetized'): string {
  return type === 'public' ? 'bg-green-100' : 'bg-blue-100';
}

export function getContentTypeLabel(type: 'public' | 'monetized'): string {
  return type === 'public' ? '🌐 Public' : '💰 Monetized';
} 