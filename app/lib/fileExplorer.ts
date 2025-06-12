import { Item, BreadcrumbItem, UploadOptions, CreateFolderOptions } from './types';
import { mockItems } from './mockData';

// Data layer functions (to be replaced with backend calls later)
export const getItemsByParentId = async (parentId: string | null): Promise<Item[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // If parentId is null, return items that have root1 as parentId
  if (parentId === null) {
    return mockItems.filter(item => item.parentId === 'root1');
  }
  
  return mockItems.filter(item => item.parentId === parentId);
};

export const getItemById = async (id: string): Promise<Item | null> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockItems.find(item => item.id === id) || null;
};

export const getBreadcrumbPath = async (folderId: string): Promise<BreadcrumbItem[]> => {
  const path: BreadcrumbItem[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const item = await getItemById(currentId);
    if (!item) break;
    
    path.unshift({ id: item.id, name: item.name });
    currentId = item.parentId;
  }

  return path;
};

// Upload functions (to be replaced with actual upload logic later)
export const uploadItem = async (options: UploadOptions): Promise<Item> => {
  // Simulate upload delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const newItem: Item = {
    id: `new-${Date.now()}`,
    name: options.name,
    type: 'file',
    mime: options.type === 'file' ? options.file?.type : undefined,
    parentId: options.parentId,
    content: options.type === 'url' ? options.url : 'https://example.com/uploaded-file',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // In real implementation, this would be an API call
  mockItems.push(newItem);
  return newItem;
};

export const createFolder = async (options: CreateFolderOptions): Promise<Item> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const newFolder: Item = {
    id: `folder-${Date.now()}`,
    name: options.name,
    type: 'folder',
    parentId: options.parentId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // In real implementation, this would be an API call
  mockItems.push(newFolder);
  return newFolder;
};

// UI helper functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIcon = (mime?: string): string => {
  if (!mime) return '📁';
  
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎥';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime.includes('pdf')) return '📄';
  if (mime.includes('word')) return '📝';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return '📊';
  
  return '��';
}; 