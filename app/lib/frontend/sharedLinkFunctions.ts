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
}

export async function createSharedLink(data: {
  itemId: string;
  type: "public" | "monetized";
  title: string;
  description?: string;
  price?: number;
  expiresAt?: Date;
}): Promise<SharedLink> {
  const response = await fetch("/api/shared-links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create shared link");
  }

  return response.json();
}

export async function getSharedLinks(params?: {
  type?: "public" | "monetized";
  page?: number;
  limit?: number;
}): Promise<SharedLinkResponse> {
  const searchParams = new URLSearchParams();

  if (params?.type) searchParams.append("type", params.type);
  if (params?.page) searchParams.append("page", params.page.toString());
  if (params?.limit) searchParams.append("limit", params.limit.toString());

  const response = await fetch(`/api/shared-links?${searchParams.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch shared links");
  }

  return response.json();
}

export async function accessSharedLink(
  linkId: string,
): Promise<SharedLinkAccessResponse> {
  const response = await fetch(`/api/shared-links/${linkId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to access shared link");
  }

  return response.json();
}

export async function addSharedItemToDrive(linkId: string): Promise<{
  success: boolean;
  message: string;
  copiedItem?: any;
}> {
  const response = await fetch(`/api/shared-links/${linkId}`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add item to drive");
  }

  return response.json();
}

export async function payForSharedLink(
  linkId: string,
  wallet: `0x${string}`,
): Promise<any> {
  try {
    const res = await purchaseMonetizedLink(wallet, linkId);
    return res;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error("Unauthorized - Please log in");
    }
    throw new Error(error.message || "Failed to complete purchase");
  }
}

export function generateShareableUrl(linkId: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/shared/${linkId}`;
  }
  return `/shared/${linkId}`;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return "0 B";

  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatPrice(price?: number): string {
  if (!price) return "$0.00";
  return `$${price.toFixed(2)}`;
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getLinkTypeColor(type: "public" | "monetized"): string {
  switch (type) {
    case "public":
      return "text-green-600 bg-green-100";
    case "monetized":
      return "text-blue-600 bg-blue-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
}

export async function copyLinkToClipboard(linkId: string): Promise<void> {
  const url = generateShareableUrl(linkId);

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(url);
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  }
}
