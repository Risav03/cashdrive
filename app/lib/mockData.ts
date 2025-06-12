import { Item, User } from './types';

// Mock user data
export const mockUser: User = {
  id: 'user1',
  name: 'Test User',
  wallet: '0x123...',
  email: 'test@example.com',
  rootStorageId: 'root1'
};

// Mock items data
export const mockItems: Item[] = [
  {
    id: 'root1',
    name: 'Root',
    type: 'folder',
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'folder1',
    name: 'Documents',
    type: 'folder',
    parentId: 'root1',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'folder2',
    name: 'Images',
    type: 'folder',
    parentId: 'root1',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'file1',
    name: 'document.pdf',
    type: 'file',
    mime: 'application/pdf',
    parentId: 'folder1',
    content: 'https://example.com/document.pdf',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'file2',
    name: 'image.jpg',
    type: 'file',
    mime: 'image/jpeg',
    parentId: 'folder2',
    content: 'https://example.com/image.jpg',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]; 