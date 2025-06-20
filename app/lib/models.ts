// This file ensures all models are registered in the correct order
// Import this file in API routes to prevent schema registration issues

import { AIChunk } from '@/app/models/AIChunk';
import { Item } from '@/app/models/Item';
import { Listing } from '@/app/models/Listing';
import { SharedLink } from '@/app/models/SharedLink';
import { Transaction } from '@/app/models/Transaction';
import User from '@/app/models/User';

// Export all models for convenience
export {
    AIChunk,
    Item,
    Listing,
    SharedLink,
    Transaction,
    User
};

