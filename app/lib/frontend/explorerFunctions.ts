import axios from 'axios';
import { BreadcrumbItem, CreateFolderOptions, DeleteResult, Item, UpdateItemOptions, UploadOptions } from '../types';

export async function getUserRootFolder(): Promise<Item> {
  try {
    const response = await axios.get('/api/items');
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data[0];
    } else {
      throw new Error('Root folder not found');
    }
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Unauthorized');
    }
    throw new Error(error.message || 'Failed to fetch root folder');
  }
}


// Fetches items by parent folder ID. If parentId is null, fetches items in the root folder.
export async function getItemsByParentId(parentId: string | null): Promise<Item[]> {
  try {
    let url = '/api/items';
    if (parentId) {
      url += `?parentId=${encodeURIComponent(parentId)}`;
    }
    const response = await axios.get(url);
    if (Array.isArray(response.data)) {
      return response.data;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Unauthorized');
    }
    throw new Error(error.message || 'Failed to fetch items');
  }
}

export async function getItem(itemId: string): Promise<Item> {
  try {
    const response = await axios.get(`/api/items/${itemId}`);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (error.response && error.response.status === 404) {
      throw new Error('Item not found');
    }
    throw new Error(error.message || 'Failed to get item');
  }
}

export async function getBreadcrumbPath(folderId: string): Promise<BreadcrumbItem[]> {
  try {
    const response = await axios.get(`/api/items/path?itemId=${encodeURIComponent(folderId)}`);
    if (Array.isArray(response.data)) {
      return response.data.map((item: any) => ({ id: item.id, name: item.name, type: item.type }));
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Unauthorized');
    }
    throw new Error(error.message || 'Failed to fetch breadcrumb path');
  }
}

export async function uploadItem(options: UploadOptions): Promise<Item> {
  try {
    const formData = new FormData();
    formData.append('name', options.name);
    formData.append('parentId', options.parentId);
    
    if (options.type === 'file' && options.file) {
      formData.append('file', options.file);
    } else if (options.type === 'url' && options.url) {
      formData.append('url', options.url);
    } else {
      throw new Error('Invalid upload options: must provide either file or URL');
    }

    const response = await axios.post('/api/items', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Unauthorized');
    }
    throw new Error(error.message || 'Failed to upload item');
  }
}

export async function createFolder(options: CreateFolderOptions): Promise<Item> {
  try {
    const response = await axios.post('/api/items', {
      name: options.name,
      parentId: options.parentId,
      type: 'folder'
    }, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Unauthorized');
    }
    throw new Error(error.message || 'Failed to create folder');
  }
}

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
  
  return '📄';
};

export async function updateItem(itemId: string, updates: UpdateItemOptions): Promise<Item> {
  try {
    const item = await getItem(itemId);
    
    let response;
    
    if (item.type === 'file') {
      const formData = new FormData();
      if (updates.name) {
        formData.append('name', updates.name);
      }
      if (updates.parentId !== undefined) {
        formData.append('parentId', updates.parentId || '');
      }
      
      response = await axios.put(`/api/items/${itemId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } else {
      response = await axios.put(`/api/items/${itemId}`, updates, {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (error.response && error.response.status === 404) {
      throw new Error('Item not found');
    }
    throw new Error(error.message || 'Failed to update item');
  }
}

export async function renameItem(itemId: string, newName: string): Promise<Item> {
  return updateItem(itemId, { name: newName });
}

export async function moveItem(itemId: string, newParentId: string | null): Promise<Item> {
  return updateItem(itemId, { parentId: newParentId || undefined });
}

export async function deleteItem(itemId: string): Promise<DeleteResult> {
  try {
    const response = await axios.delete(`/api/items/${itemId}`);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (error.response && error.response.status === 404) {
      throw new Error('Item not found');
    }
    throw new Error(error.message || 'Failed to delete item');
  }
} 
