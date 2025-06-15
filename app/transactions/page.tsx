'use client';

import { formatPrice, formatTransactionDate, getFileIcon, getNetworkDisplayName, getTransactionStatusColor, getTransactionTypeColor, getTransactions } from '@/app/lib/frontend/marketplaceFunctions';
import { Transaction, TransactionsResponse } from '@/app/lib/types';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function TransactionsPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalItems: 0
  });
  const [filters, setFilters] = useState({
    type: 'all' as 'purchases' | 'sales' | 'all',
    status: '' as '' | 'completed' | 'pending' | 'failed' | 'refunded',
    page: 1,
    limit: 20
  });

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: TransactionsResponse = await getTransactions({
        type: filters.type === 'all' ? undefined : filters.type,
        status: filters.status || undefined,
        page: filters.page,
        limit: filters.limit
      });
      setTransactions(response.transactions);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchTransactions();
    }
  }, [session, filters]);

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900">Transaction History</h1>
            <p className="mt-4 text-lg text-gray-600">Please log in to view your transaction history</p>
            <Link
              href="/api/auth/signin"
              className="mt-6 inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
            >
              Sign In
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900">Transaction History</h1>
            <div className="mt-12 flex justify-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900">Transaction History</h1>
            <div className="mt-12 bg-red-50 border border-red-200 rounded-md p-4 max-w-md mx-auto">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error loading transactions
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={fetchTransactions}
                      className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Transaction History</h1>
          <p className="mt-2 text-lg text-gray-600">View your purchase and sale history</p>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange({ type: e.target.value as any })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All Transactions</option>
                <option value="purchases">Purchases</option>
                <option value="sales">Sales</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange({ status: e.target.value as any })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                {pagination.totalItems} {pagination.totalItems === 1 ? 'transaction' : 'transactions'} found
              </div>
            </div>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900">No transactions found</h3>
            <p className="mt-2 text-gray-500">
              {filters.type === 'purchases' 
                ? "You haven't made any purchases yet." 
                : filters.type === 'sales'
                ? "You haven't made any sales yet."
                : "You don't have any transactions yet."}
            </p>
            <Link
              href="/marketplace"
              className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <>
            {/* Transactions List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <li key={transaction._id}>
                    <Link
                      href={`/transactions/${transaction._id}`}
                      className="block hover:bg-gray-50 px-4 py-4 sm:px-6"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <span className="text-2xl">
                              {getFileIcon(transaction.item.mimeType)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {transaction.listing?.title || transaction.metadata?.sharedLinkTitle || transaction.item.name}
                              </p>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTransactionTypeColor(transaction.transactionType || 'purchase')}`}>
                                {transaction.transactionType}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                transaction.listing ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                              }`}>
                                {transaction.listing ? 'Marketplace' : 'Shared Link'}
                              </span>
                              {transaction.metadata?.blockchainTransaction && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Blockchain Verified
                                </span>
                              )}
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTransactionStatusColor(transaction.status)}`}>
                                {transaction.status}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center text-sm text-gray-500">
                              <p>
                                {transaction.transactionType === 'purchase' 
                                  ? `Purchased from ${transaction.seller.name}`
                                  : `Sold to ${transaction.buyer.name}`
                                }
                              </p>
                              <span className="mx-2">•</span>
                              <p>{formatTransactionDate(transaction.purchaseDate)}</p>
                              {transaction.metadata?.network && (
                                <>
                                  <span className="mx-2">•</span>
                                  <p className="capitalize">{getNetworkDisplayName(transaction.metadata.network)}</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {formatPrice(transaction.amount)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {transaction.receiptNumber}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pagination */}
            {pagination.total > 1 && (
              <div className="mt-6 flex items-center justify-center">
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(pagination.current - 1)}
                    disabled={pagination.current === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: pagination.total }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === pagination.current
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(pagination.current + 1)}
                    disabled={pagination.current === pagination.total}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
} 