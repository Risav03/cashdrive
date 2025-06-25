import { Item } from '@/app/models/Item';
import User from '@/app/models/User';
import { Types } from 'mongoose';

interface QueueItem {
  originalId: string;
  newParentId: string;
  name: string;
}

interface ItemDocument {
  _id: Types.ObjectId;
  name: string;
  type: string;
  parentId: string;
  size?: number;
  mimeType?: string;
  url?: string;
  owner: string;
  contentSource?: string;
}

export async function copyItemWithBFS(originalItemId: string, newParentId: string, ownerId: string, suffix = '(Shared)'): Promise<any> {
  const originalItem = await Item.findById(originalItemId).lean<ItemDocument>();
  if (!originalItem) {
    throw new Error('Original item not found');
  }

  const queue: QueueItem[] = [];
  const idMap = new Map<string, string>();

  // Function to get a unique name
  async function getUniqueName(baseName: string, parentId: string): Promise<string> {
    let counter = 0;
    let finalName = `${baseName} ${suffix}`;
    let isUnique = false;

    while (!isUnique) {
      try {
        // Check if name exists
        const existing = await Item.findOne({
          parentId,
          name: finalName,
          owner: ownerId
        });

        if (!existing) {
          isUnique = true;
        } else {
          counter++;
          finalName = `${baseName} ${suffix} (${counter})`;
        }
      } catch (error) {
        counter++;
        finalName = `${baseName} ${suffix} (${counter})`;
      }
    }

    return finalName;
  }

  // Get unique name for root item
  const newName = await getUniqueName(originalItem.name, newParentId);

  const rootCopy = await Item.create({
    name: newName,
    type: originalItem?.type,
    parentId: newParentId,
    size: originalItem.size || 0,
    mimeType: originalItem?.mimeType,
    url: originalItem.url,
    owner: ownerId,
    contentSource: 'shared_link'
  });

  if (originalItem?.type === 'folder') {
    queue.push({
      originalId: originalItem._id.toString(),
      newParentId: rootCopy._id.toString(),
      name: originalItem.name
    });
    idMap.set(originalItem._id.toString(), rootCopy._id.toString());
  }

  while (queue.length > 0) {
    const batch = queue.splice(0, 10);
    
    const children = await Item.find({
      parentId: { $in: batch.map(item => item.originalId) }
    }).lean<ItemDocument[]>();

    const childrenByParent = children.reduce((acc, child) => {
      const parentId = child.parentId.toString();
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push(child);
      return acc;
    }, {} as Record<string, ItemDocument[]>);

    const copyPromises = batch.flatMap(parent => {
      const parentChildren = childrenByParent[parent.originalId] || [];
      return parentChildren.map(async child => {
        const newParentId = idMap.get(parent.originalId)!;

        // Get unique name for child item
        const childName = await getUniqueName(child.name, newParentId);
        
        const copy = await Item.create({
          name: childName,
          type: child?.type,
          parentId: newParentId,
          size: child.size || 0,
          mimeType: child?.mimeType,
          url: child.url,
          owner: ownerId,
          contentSource: 'shared_link'
        });

        if (child?.type === 'folder') {
          queue.push({
            originalId: child._id.toString(),
            newParentId: copy._id.toString(),
            name: child.name
          });
          idMap.set(child._id.toString(), copy._id.toString());
        }
      });
    });

    await Promise.all(copyPromises);
  }

  return rootCopy;
}

export async function ensureUserFolder(userId: string, folderName: string): Promise<any> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  let targetFolder = await Item.findOne({
    name: folderName,
    type: 'folder',
    parentId: user.rootFolder.toString()
  });

  if (!targetFolder) {
    targetFolder = await Item.create({
      name: folderName,
      type: 'folder',
      parentId: user.rootFolder.toString(),
      owner: userId
    });
  }

  return targetFolder;
}

export async function copyItemToUserDrive(userId: string, item: any, targetFolderName = 'shared'): Promise<any> {
  try {
    const targetFolder = await ensureUserFolder(userId, targetFolderName);
    return await copyItemWithBFS(item._id.toString(), targetFolder._id.toString(), userId);
  } catch (error) {
    console.error(`Error copying item to ${targetFolderName} folder:`, error);
    throw error;
  }
}

export interface LinkAccessResponse {
  link: any;
  canAccess: boolean;
  requiresPayment?: boolean;
  requiresAuth?: boolean;
  alreadyPaid?: boolean;
}

export function createLinkAccessResponse(link: any, isMonetized: boolean, userId?: string): LinkAccessResponse {
  // For public links or paid users
  if (!isMonetized || (userId && link.paidUsers.some((paidUserId: any) => paidUserId.toString() === userId))) {
    return {
      link,
      canAccess: true,
      requiresPayment: false,
      ...(isMonetized && { alreadyPaid: true })
    };
  }

  // For monetized links - return limited info
  const limitedLinkInfo = {
    _id: link._id,
    title: link.title,
    description: link.description,
    type: link?.type,
    price: link.price,
    item: {
      name: link.item.name,
      type: link.item?.type,
      size: link.item.size
    }
  };

  return {
    link: limitedLinkInfo,
    canAccess: false,
    requiresPayment: true,
    requiresAuth: !userId
  };
} 