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
  owner: string;
  content?: string;
  createdAt: Date;
  updatedAt: Date;
  // AI processing fields
  aiProcessing?: {
    status: 'none' | 'pending' | 'processing' | 'completed' | 'failed';
    textContent?: string;
    processedAt?: Date;
    topics?: string[];
    chunksCount?: number;
  };
  
  contentSource?: 'user_upload' | 'ai_generated' | 'marketplace_purchase' | 'shared_link';

  aiGeneration?: {
    sourcePrompt: string;
    sourceFiles?: string[];
    generatedAt?: Date;
  };

  parent?: string;
  path: string;
  generatedBy?: 'ai' | 'user';
}

export interface AIChunk {
  _id: string;
  item: string;
  text: string;
  embedding: number[];
  chunkIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  _id: string;
  name: string;
  wallet: string;
  email: string;
  rootFolder: string;
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
  status: 'active' | 'inactive';
  tags: string[];
  views: number;
  affiliateEnabled: boolean;
  defaultCommissionRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateListingOptions {
  itemId: string;
  title: string;
  description: string;
  price: number;
  tags?: string[];
  affiliateEnabled?: boolean;
  defaultCommissionRate?: number;
}

export interface UpdateListingOptions {
  title?: string;
  description?: string;
  price?: number;
  status?: 'active' | 'inactive';
  tags?: string[];
  affiliateEnabled?: boolean;
  defaultCommissionRate?: number;
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

export interface Affiliate {
  _id: string;
  listing?: Listing;
  sharedLink?: SharedLink;
  owner: User;
  affiliateUser: User;
  commissionRate: number;
  affiliateCode: string;
  status: 'active' | 'inactive' | 'suspended';
  totalEarnings: number;
  totalSales: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  _id: string;
  listing?: Listing;
  sharedLink?: SharedLink;
  buyer: User;
  seller: User;
  item: Item;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  transactionId: string;
  receiptNumber: string;
  purchaseDate: Date;
  transactionType: 'purchase' | 'sale' | 'commission';
  paymentFlow: 'direct' | 'admin';
  affiliateInfo?: {
    isAffiliateSale: boolean;
    originalAmount: number;
    netAmount: number;
    commissionDistribution: {
      affiliateId: string;
      affiliate?: Affiliate;
      amount: number;
      commissionRate: number;
    }[];
  };
  parentTransaction?: string;
  metadata?: {
    blockchainTransaction?: string;
    network?: string;
    payer?: string;
    success?: boolean;
    paymentResponseRaw?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Commission {
  _id: string;
  affiliate: Affiliate;
  originalTransaction: Transaction;
  commissionTransaction?: Transaction;
  commissionAmount: number;
  commissionRate: number;
  status: 'pending' | 'paid' | 'failed';
  paymentFlow: 'direct' | 'admin';
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Shared Link types
export interface SharedLink {
  _id: string;
  item: Item;
  owner: User;
  linkId: string;
  type: 'public' | 'monetized';
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

export interface TransactionsResponse {
  transactions: Transaction[];
  pagination: {
    current: number;
    total: number;
    count: number;
    totalItems: number;
  };
}

export interface ItemsResponse {
  items: Item[];
  pagination: {
    current: number;
    total: number;
    count: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor: string | null;
    limit: number;
  };
}

export interface TransactionFilters {
  type?: 'purchases' | 'sales' | 'all';
  status?: 'completed' | 'pending' | 'failed' | 'refunded';
  limit?: number;
  page?: number;
}

export interface PurchaseResponse {
  transactionData: {
    transaction: Transaction;
    copiedItem: {
      _id: string;
      name: string;
      path: string;
    };
    paymentDetails?: {
      transaction: string;
      network: string;
      payer: string;
      success: boolean;
    };
    message: string;
  };
}

export interface ListingFilters {
  status?: string;
  sellerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  page?: number;
  search?: string;
  tags?: string[];
} 