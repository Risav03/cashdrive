export type ItemType = 'file' | 'folder';

export interface Item {
  _id: string;
  name: string;
  type: ItemType;
  mime?: string;
  mimeType?: string;
  size?: number;
  url?: string;
  parentId: string | null;
  content?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  _id: string;
  name: string;
  wallet: string;
  email: string;
  rootStorageId: string;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
  type: ItemType;
}

export interface UploadOptions {
  type: 'file' | 'url';
  file?: File;
  url?: string;
  name: string;
  parentId: string;
}

export interface CreateFolderOptions {
  name: string;
  parentId: string | null;
}

export interface UpdateItemOptions {
  name?: string;
  parentId?: string;
}

export interface DeleteResult {
  message: string;
  deletedCount: number;
}

// Marketplace types
export interface Listing {
  _id: string;
  item: Item;
  seller: User;
  title: string;
  description: string;
  price: number;
  status: 'active' | 'sold' | 'inactive';
  tags: string[];
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateListingOptions {
  itemId: string;
  title: string;
  description: string;
  price: number;
  tags?: string[];
}

export interface UpdateListingOptions {
  title?: string;
  description?: string;
  price?: number;
  status?: 'active' | 'sold' | 'inactive';
  tags?: string[];
}

export interface ListingsResponse {
  listings: Listing[];
  pagination: {
    current: number;
    total: number;
    count: number;
    totalItems: number;
  };
}

export interface ListingFilters {
  status?: string;
  sellerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  page?: number;
} 