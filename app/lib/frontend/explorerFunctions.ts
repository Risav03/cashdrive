import axios from 'axios';
import { Item, BreadcrumbItem, UploadOptions, CreateFolderOptions, User } from '../types';

// Fetches the user's root folder item from the backend.  
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

// Fetches item by its ID.
export async function getItemById(id: string): Promise<Item | null> {
  try {
    const response = await axios.get(`/api/items/${encodeURIComponent(id)}`);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (error.response && error.response.status === 404) {
      throw new Error('Item not found');
    }
    throw new Error(error.message || 'Failed to fetch item');
  }
}

// Fetches breadcrumb path from root to the given folder ID.
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

// Uploads a file or URL to the backend and returns the created Item.
export async function uploadItem(options: UploadOptions): Promise<Item> {
  try {
    const formData = new FormData();
    formData.append('name', options.name);
    formData.append('parentId', options.parentId);
    if (options.type === 'file' && options.file) {
      formData.append('file', options.file);
    } else if (options.type === 'url' && options.url) {
      formData.append('file', new Blob([], { type: 'text/plain' })); // Placeholder empty file
      formData.append('url', options.url);
    } else {
      throw new Error('Invalid upload options');
    }

    const response = await axios.post('/api/items/upload', formData, {
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

// Creates a new folder on the backend and returns the created Item.
export async function createFolder(options: CreateFolderOptions): Promise<Item> {
  try {
    const response = await axios.post('/api/items', { name: options.name, parentId: options.parentId, type: 'folder' });
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Unauthorized');
    }
    throw new Error(error.message || 'Failed to create folder');
  }
}
