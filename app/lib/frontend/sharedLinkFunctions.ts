import { purchaseMonetizedLink } from "@/actions/actions";

export interface SharedLink {
  _id: string;
  item: {
    _id: string;
    name: string;
    type: "file" | "folder";
    size?: number;
    mimeType?: string;
    url?: string;
  };
  owner: {
    _id: string;
    name: string;
    email: string;
    wallet: string;
  };
  linkId: string;
  type: "public" | "monetized";
  price?: number;
  title: string;
  description?: string;
  isActive: boolean;
  expiresAt?: Date;
  accessCount: number;
  paidUsers: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SharedLinkResponse {
  links: SharedLink[];
  pagination: {
    current: number;
    total: number;
    count: number;
    totalItems: number;
  };
}

export interface SharedLinkAccessResponse {
  link: SharedLink | Partial<SharedLink>;
  canAccess: boolean;
  requiresPayment: boolean;
  requiresAuth?: boolean;
  alreadyPaid?: boolean;
  isOwner?: boolean;
}

interface ApiError {
  error: string;
}

const API_BASE = '/api/shared-links';

async function handleApiResponse<T>(response: Response, errorMessage: string): Promise<T> {
  if (!response.ok) {
    const error = await response.json() as ApiError;
    throw new Error(error.error || errorMessage);
  }
  return response.json();
}

export async function createSharedLink(data: {
  itemId: string;
  type: "public" | "monetized";
  title: string;
  description?: string;
  price?: number;
  expiresAt?: Date;
}): Promise<SharedLink> {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return handleApiResponse<SharedLink>(response, "Failed to create shared link");
}

export async function getSharedLinks(params?: {
  type?: "public" | "monetized";
  page?: number;
  limit?: number;
}): Promise<SharedLinkResponse> {
  const searchParams = new URLSearchParams(
    Object.entries(params || {}).map(([key, value]) => [key, String(value)])
  );

  const response = await fetch(`${API_BASE}?${searchParams}`);
  return handleApiResponse<SharedLinkResponse>(response, "Failed to fetch shared links");
}

export async function accessSharedLink(
  linkId: string,
): Promise<SharedLinkAccessResponse> {
  const response = await fetch(`${API_BASE}/${linkId}`);
  return handleApiResponse<SharedLinkAccessResponse>(response, "Failed to access shared link");
}

export async function addSharedItemToDrive(linkId: string): Promise<{
  success: boolean;
  message: string;
  copiedItem?: any;
}> {
  const response = await fetch(`${API_BASE}/${linkId}`, {
    method: "POST",
  });
  return handleApiResponse(response, "Failed to add item to drive");
}

export async function payForSharedLink(
  linkId: string,
  wallet: `0x${string}`,
): Promise<any> {
  try {
    return await purchaseMonetizedLink(wallet, linkId);
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error("Unauthorized - Please log in");
    }
    throw error.message ? new Error(error.message) : error;
  }
}

export function generateShareableUrl(linkId: string): string {
  return typeof window !== "undefined" 
    ? `${window.location.origin}/shared/${linkId}`
    : `/shared/${linkId}`;
}

const FILE_SIZES = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatFileSize(bytes?: number): string {
  if (!bytes) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${FILE_SIZES[i]}`;
}

export function formatPrice(price?: number): string {
  return price ? `$${price.toFixed(2)}` : "$0.00";
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const LINK_TYPE_COLORS = {
  public: "text-green-600 bg-green-100",
  monetized: "text-blue-600 bg-blue-100",
} as const;

export function getLinkTypeColor(type: "public" | "monetized"): string {
  return LINK_TYPE_COLORS[type] || "text-gray-600 bg-gray-100";
}

export async function copyLinkToClipboard(linkId: string): Promise<void> {
  const url = generateShareableUrl(linkId);
  
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      return;
    }
    
    const textArea = document.createElement("textarea");
    textArea.value = url;
    textArea.style.position = 'fixed';  // Prevent scrolling to bottom
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    throw new Error('Failed to copy link to clipboard');
  }
}
