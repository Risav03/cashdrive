export type ItemType = 'file' | 'folder';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  mime?: string;
  parentId: string | null;
  content?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  wallet: string;
  email: string;
  rootStorageId: string;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
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