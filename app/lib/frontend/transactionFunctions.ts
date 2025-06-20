import { purchaseFromMarketplace } from '@/actions/actions';
import axios from 'axios';
import { Transaction, TransactionFilters, TransactionsResponse } from '../types';
import { handleApiError } from './marketplaceFunctions';

const API_ENDPOINTS = {
  transactions: '/api/transactions'
} as const;

export async function getTransactions(filters: TransactionFilters = {}): Promise<TransactionsResponse> {
  try {
    const params = new URLSearchParams(
      Object.entries(filters)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    );

    const response = await axios.get(`${API_ENDPOINTS.transactions}?${params.toString()}`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to fetch transactions');
  }
}

export async function getTransaction(transactionId: string): Promise<Transaction> {
  try {
    const response = await axios.get(`${API_ENDPOINTS.transactions}/${transactionId}`);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to fetch transaction');
  }
}

export async function hasUserPurchased(listingId: string): Promise<boolean> {
  try {
    const { transactions } = await getTransactions({ type: 'purchases', limit: 100 });
    return transactions.some(transaction => 
      transaction.listing?._id === listingId && transaction.status === 'completed'
    );
  } catch (error) {
    console.error('Error checking purchase status:', error);
    return false;
  }
}

export function getTransactionStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
    default: 'bg-gray-100 text-gray-800'
  };
  return colorMap[status] || colorMap.default;
}

export function getTransactionTypeColor(type: string): string {
  const colorMap: Record<string, string> = {
    direct_purchase: 'bg-blue-100 text-blue-800',
    admin_purchase: 'bg-purple-100 text-purple-800',
    seller_payout: 'bg-green-100 text-green-800',
    affiliate_commission: 'bg-yellow-100 text-yellow-800',
    default: 'bg-gray-100 text-gray-800'
  };
  return colorMap[type] || colorMap.default;
}

export const formatTransactionDate = (date: Date | string): string => 
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));

// Blockchain utilities
export const formatBlockchainAddress = (address: string): string => 
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

export const formatTransactionHash = (hash: string): string => 
  hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : '';

const NETWORK_CONFIG = {
  'base-sepolia': {
    name: 'Base Sepolia',
    explorerUrl: 'https://sepolia.basescan.org/tx/'
  },
  'base': {
    name: 'Base',
    explorerUrl: 'https://basescan.org/tx/'
  },
  'ethereum': {
    name: 'Ethereum',
    explorerUrl: 'https://etherscan.io/tx/'
  },
  'sepolia': {
    name: 'Sepolia',
    explorerUrl: 'https://sepolia.etherscan.io/tx/'
  }
} as const;

export function getBlockExplorerUrl(network: string, txHash: string): string {
  const config = NETWORK_CONFIG[network as keyof typeof NETWORK_CONFIG];
  return config ? `${config.explorerUrl}${txHash}` : `${NETWORK_CONFIG['base-sepolia'].explorerUrl}${txHash}`;
}

export function getNetworkDisplayName(network: string): string {
  const config = NETWORK_CONFIG[network as keyof typeof NETWORK_CONFIG];
  return config ? config.name : network.charAt(0).toUpperCase() + network.slice(1);
}

export async function purchaseListing(
  listingId: string, 
  wallet: `0x${string}`, 
  affiliateCode?: string
): Promise<any> {
  try {
    const result = await purchaseFromMarketplace(wallet, listingId, affiliateCode);
    
    if (!result) {
      throw new Error('No response received from purchase');
    }

    if (result.transactionData) {
      return result;
    }

    return {
      transactionData: {
        transaction: result.transaction,
        copiedItem: result.copiedItem,
        paymentDetails: result.paymentDetails,
        message: result.message
      }
    };
  } catch (error: any) {
    console.error('Purchase error:', error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
} 